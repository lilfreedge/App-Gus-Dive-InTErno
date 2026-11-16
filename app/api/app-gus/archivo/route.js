import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { docValido, buscarPorDoc, celCoincide } from "@/lib/estudiantes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V86 (maqueta V86: "1. sí", "2. B", "3. sí") -- "Mi cuenta" del app Gus Dive:
// el cliente ve su foto, la imagen de su cédula (él escogió la B: que también
// la pueda ver) y su firma. Las tres viven en el almacenamiento privado de los
// estudiantes. Aquí se confirma quién es (cédula o pasaporte + celular, igual
// que al entrar) y se le da un permiso corto para abrir SOLO su archivo: la
// ruta sale de su ficha, nunca de lo que mande el navegador.
const QUE = { foto: "tu foto", cedula: "tu cédula", firma: "tu firma" };
const SEGUNDOS = { foto: 3600, cedula: 120, firma: 120 };

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const que = String(body.que || "");
  if (!QUE[que]) return NextResponse.json({ error: "No sabemos qué archivo es." }, { status: 400 });
  const s = createServiceClient();
  const tipo = body.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";
  if (!docValido(tipo, body.doc)) return NextResponse.json({ error: "Revisa tu cédula o pasaporte." }, { status: 400 });
  const b = await buscarPorDoc(s, tipo, body.doc);
  if (!b || b.staff || !celCoincide(b, body.cel)) return NextResponse.json({ error: "No pudimos confirmar tus datos. Sal y entra otra vez con tu cédula." }, { status: 400 });

  let ruta = que === "foto" ? b.foto : que === "cedula" ? b.docFoto : "";
  if (que === "firma") {
    // La firma es de cada curso: se enseña la del más reciente que la tenga.
    const { data } = await s.from("est_estudiantes").select("firma, estado, creado_en").eq("buzo_id", b.id).neq("estado", "cancelado").order("creado_en", { ascending: false });
    ruta = (data || []).find((x) => x.firma)?.firma || "";
  }
  if (!ruta) return NextResponse.json({ error: `Todavía no tenemos ${QUE[que]}.` }, { status: 404 });

  const { data, error } = await s.storage.from("estudiantes-docs").createSignedUrl(ruta, SEGUNDOS[que]);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "No se pudo abrir. Intenta de nuevo." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, pdf: /\.pdf$/i.test(ruta) });
}
