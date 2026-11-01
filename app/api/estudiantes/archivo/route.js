import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buzoAFila } from "@/lib/viajes/datos";
import { buscarPorDoc, celCoincide, logLink } from "@/lib/estudiantes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el estudiante sube desde el link su foto, la foto
// de su cédula, el comprobante de pago o su firma. Se verifica con su
// cédula/pasaporte y su celular. Va al bucket privado "estudiantes-docs".
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];
const QUE = { foto: "su foto", cedula: "la foto de su cédula", comprobante: "su comprobante de pago", firma: "su firma" };

export async function POST(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No llegó el archivo." }, { status: 400 });
  const tipoDoc = form.get("tipoDoc") === "pasaporte" ? "pasaporte" : "cedula";
  const que = String(form.get("que") || "");
  const file = form.get("archivo");
  if (!QUE[que]) return NextResponse.json({ error: "No sabemos qué es ese archivo." }, { status: 400 });
  if (!file || typeof file === "string") return NextResponse.json({ error: "No llegó el archivo." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "El archivo pesa más de 10 MB." }, { status: 400 });
  const tipoArchivo = file.type || "";
  if (!TIPOS.includes(tipoArchivo) || (que !== "comprobante" && tipoArchivo === "application/pdf")) return NextResponse.json({ error: que === "comprobante" ? "Sube una foto (JPG, PNG) o un PDF." : "Sube una foto (JPG o PNG)." }, { status: 400 });

  const s = createServiceClient();
  const b = await buscarPorDoc(s, tipoDoc, form.get("doc"));
  if (!b || !celCoincide(b, form.get("cel"))) return NextResponse.json({ error: "No pudimos confirmar tus datos. Escríbenos por WhatsApp." }, { status: 400 });

  // El curso: el que diga, si es suyo; si no, el más reciente que tenga abierto.
  const { data: cursos } = await s.from("est_estudiantes").select("id, comprobantes, pasos, estado").eq("buzo_id", b.id).order("creado_en", { ascending: false });
  const abiertos = (cursos || []).filter((x) => !["cancelado"].includes(x.estado));
  const est = abiertos.find((x) => x.id === String(form.get("estudianteId") || "")) || abiertos.find((x) => x.estado !== "entregada") || abiertos[0];
  if (["comprobante", "firma"].includes(que) && !est) return NextResponse.json({ error: "No tienes un curso registrado." }, { status: 400 });

  const ext = tipoArchivo === "application/pdf" ? "pdf" : (tipoArchivo.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const ruta = `${["foto", "cedula"].includes(que) ? `buzo-${b.id}` : est.id}/${que}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: eSubir } = await s.storage.from("estudiantes-docs").upload(ruta, bytes, { contentType: tipoArchivo, upsert: false });
  if (eSubir) return NextResponse.json({ error: "No se pudo subir. Intenta de nuevo." }, { status: 500 });

  if (que === "foto" || que === "cedula") {
    await s.from("viajes_buzos").update(buzoAFila(que === "foto" ? { foto: ruta } : { docFoto: ruta })).eq("id", b.id);
    // En sus cursos abiertos, ese paso queda Listo.
    const paso = que === "foto" ? "foto" : "identificacion";
    for (const x of abiertos.filter((y) => y.estado === "curso" && (y.pasos || {})[paso] === "pendiente")) {
      await s.from("est_estudiantes").update({ pasos: { ...x.pasos, [paso]: "listo" }, actualizado_en: new Date().toISOString() }).eq("id", x.id);
    }
  } else if (que === "comprobante") {
    if ((est.comprobantes || []).length >= 10) return NextResponse.json({ error: "Ya subiste varios comprobantes. Escríbenos por WhatsApp." }, { status: 400 });
    const c = { ruta, nombre: String(file.name || `comprobante.${ext}`).slice(0, 80), en: new Date().toISOString(), via: "link" };
    await s.from("est_estudiantes").update({ comprobantes: [...(est.comprobantes || []), c], actualizado_en: new Date().toISOString() }).eq("id", est.id);
  } else {
    await s.from("est_estudiantes").update({ firma: ruta, actualizado_en: new Date().toISOString() }).eq("id", est.id);
  }
  await logLink(s, est?.id || null, `Subió ${QUE[que]} por el link: ${b.nombre}`);
  return NextResponse.json({ ok: true });
}
