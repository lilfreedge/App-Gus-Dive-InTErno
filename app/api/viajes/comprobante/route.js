import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { nuevoId } from "@/lib/viajes/datos";
import { formatoCedula, hoyISO } from "@/lib/viajes/modelo";
import { avisar } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V42 -- El buzo sube el comprobante de su pago desde el link del viaje
// (pedido explícito: "hay manera de que el cliente pueda attach comprobante
// de pago?"). Se verifica con su cédula/pasaporte que de verdad está inscrito
// en ese viaje; el archivo va al bucket privado "viajes-comprobantes" y en
// el app le sale un clip a quien registra pagos.
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

export async function POST(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No llegó el archivo." }, { status: 400 });
  const slug = String(form.get("slug") || "");
  const tipo = form.get("tipoDoc") === "pasaporte" ? "pasaporte" : "cedula";
  const doc = String(form.get("doc") || "");
  const file = form.get("archivo");
  if (!file || typeof file === "string") return NextResponse.json({ error: "No llegó el archivo." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "El archivo pesa más de 10 MB." }, { status: 400 });
  const tipoArchivo = file.type || "";
  if (!TIPOS.includes(tipoArchivo)) return NextResponse.json({ error: "Sube una foto (JPG, PNG) o un PDF." }, { status: 400 });

  const s = createServiceClient();
  const { data: v } = await s.from("viajes").select("id, nombre").eq("slug", slug).maybeSingle();
  if (!v) return NextResponse.json({ error: "Ese viaje no existe." }, { status: 404 });
  const valor = tipo === "pasaporte" ? doc.toUpperCase().replace(/\s/g, "") : formatoCedula(doc);
  const { data: b } = await s.from("viajes_buzos").select("id, nombre").eq(tipo === "pasaporte" ? "pasaporte" : "documento", valor).maybeSingle();
  if (!b) return NextResponse.json({ error: "No encontramos esa cédula en este viaje." }, { status: 404 });
  const { data: ins } = await s.from("viajes_inscripciones").select("id, estado, comprobantes").eq("viaje_id", v.id).eq("buzo_id", b.id).maybeSingle();
  if (!ins || ins.estado === "quitado") return NextResponse.json({ error: "No estás inscrito en este viaje." }, { status: 404 });
  if ((ins.comprobantes || []).length >= 10) return NextResponse.json({ error: "Ya subiste varios comprobantes. Escríbenos por WhatsApp." }, { status: 400 });

  const ext = tipoArchivo === "application/pdf" ? "pdf" : (tipoArchivo.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${v.id}/${ins.id}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error: eSubir } = await s.storage.from("viajes-comprobantes").upload(path, bytes, { contentType: tipoArchivo, upsert: false });
  if (eSubir) return NextResponse.json({ error: "No se pudo subir. Intenta de nuevo." }, { status: 500 });

  const c = { id: nuevoId(), path, nombre: String(file.name || `comprobante.${ext}`).slice(0, 80), fecha: hoyISO(), por: "Link", visto: false };
  await s.from("viajes_inscripciones").update({ comprobantes: [...(ins.comprobantes || []), c] }).eq("id", ins.id);
  await s.from("viajes_bitacora").insert({ viaje_id: v.id, quien: "Link", texto: `Subió su comprobante por el link: ${b.nombre}`, despues: c.nombre });
  // V44: aviso a quien lo tenga activado.
  await avisar(
    s,
    "comprobante",
    { titulo: `Comprobante nuevo · ${v.nombre}`, texto: `${b.nombre} subió su comprobante de pago.`, viajeId: v.id, ruta: `/viajes-buceos/viaje/${v.id}` },
    new URL(request.url).origin
  );
  return NextResponse.json({ ok: true, nombre: c.nombre });
}
