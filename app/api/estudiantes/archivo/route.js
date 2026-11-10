import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buzoAFila } from "@/lib/viajes/datos";
import { buscarPorDoc, celCoincide, logLink, tokenMenorValido, buzoPorId, puedeCambiarArchivo } from "@/lib/estudiantes/servidor";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";
import { avisar as avisarBuceos } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el estudiante sube desde el link su foto, su cédula
// (foto, escaneo o PDF), el comprobante de pago o su firma. Se verifica con
// su cédula/pasaporte y su celular. Va al bucket privado "estudiantes-docs".
//
// V54 (nota "App Gus interno", 1-nov: "No me esta dejando subir mi cédula,
// pon que acepte formato png jpg, pdf o heic" -- salía "Failed to fetch"):
// el archivo ya no pasa por aquí, porque Vercel corta lo que pese más de
// ~4.5 MB. Ahora son dos llamadas en JSON:
//   accion "firmar" -> revisa quién es y qué sube, y da un permiso para
//                      subirlo directo al almacenamiento (createSignedUploadUrl)
//   accion "listo"  -> revisa que el archivo esté ahí y lo pone en su ficha
// Lo de antes (el archivo en un FormData) se deja para los archivos chicos
// de un link que alguien tenga abierto desde antes de esta versión.
const BUCKET = "estudiantes-docs";
const MAX = 10 * 1024 * 1024;
const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const PERMITIDOS = {
  foto: IMAGENES,
  cedula: [...IMAGENES, "application/pdf"],
  comprobante: [...IMAGENES, "application/pdf"],
  firma: ["image/png"],
  // V64 ("281"): su certificación (captura de la app de su agencia o foto de la tarjeta).
  certificacion: [...IMAGENES, "application/pdf"],
};
const QUE = { foto: "su foto", cedula: "su cédula", comprobante: "su comprobante de pago", firma: "su firma", certificacion: "su certificación" };
const MSJ_TIPO = { certificacion: "Sube una captura o una foto (JPG, PNG, HEIC) o un PDF.", foto: "Sube una foto (JPG, PNG o HEIC).", cedula: "Sube una foto o un escaneo (JPG, PNG, HEIC o PDF).", comprobante: "Sube una foto (JPG, PNG, HEIC) o un PDF.", firma: "Vuelve a firmar." };
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

const mal = (error, status = 400) => NextResponse.json({ error }, { status });

// Quién es, qué sube y a cuál de sus cursos va. Devuelve { error } o todo lo necesario.
async function preparar(s, datos) {
  const tipoDoc = datos.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";
  const que = String(datos.que || "");
  if (!QUE[que]) return { error: "No sabemos qué es ese archivo." };
  const tipo = String(datos.tipo || "");
  if (!PERMITIDOS[que].includes(tipo)) return { error: MSJ_TIPO[que] };
  if (!(Number(datos.tamano) > 0)) return { error: "No llegó el archivo." };
  if (Number(datos.tamano) > MAX) return { error: "El archivo pesa más de 10 MB." };

  // V62 ("229"): un menor (sin cédula) se confirma con el permiso que le dio
  // el servidor al registrarlo.
  let b;
  if (datos.buzoId) {
    b = tokenMenorValido(datos.buzoId, datos.token) ? await buzoPorId(s, datos.buzoId) : null;
    if (!b) return { error: "No pudimos confirmar los datos. Escríbenos por WhatsApp." };
  } else {
    b = await buscarPorDoc(s, tipoDoc, datos.doc);
    if (!b || !celCoincide(b, datos.cel)) return { error: "No pudimos confirmar tus datos. Escríbenos por WhatsApp." };
  }

  // El curso: el que diga, si es suyo; si no, el más reciente que tenga abierto.
  const { data: cursos } = await s.from("est_estudiantes").select("id, curso, comprobantes, pasos, estado, firma").eq("buzo_id", b.id).order("creado_en", { ascending: false });
  const abiertos = (cursos || []).filter((x) => !["cancelado"].includes(x.estado));
  const est = abiertos.find((x) => x.id === String(datos.estudianteId || "")) || abiertos.find((x) => !["entregada", "avisado"].includes(x.estado)) || abiertos[0];
  if (["comprobante", "firma"].includes(que) && !est) return { error: "No tienes un curso registrado." };
  // V63 ("162"): la foto y la firma solo se cambian cada 6 meses.
  const ya = que === "foto" ? puedeCambiarArchivo(b.foto) : que === "firma" ? puedeCambiarArchivo(est?.firma) : { puede: true };
  if (!ya.puede) return { error: `${que === "foto" ? "La foto" : "La firma"} se puede cambiar cada 6 meses. La próxima vez: desde el ${ya.desdeCuando.split("-").reverse().join("/")}.` };
  if (que === "comprobante" && (est.comprobantes || []).length >= 10) return { error: "Ya subiste varios comprobantes. Escríbenos por WhatsApp." };
  const carpeta = ["foto", "cedula", "certificacion"].includes(que) ? `buzo-${b.id}` : est.id;
  return { b, que, tipo, abiertos, est, carpeta };
}

// Lo pone en su ficha (y en sus cursos abiertos) y lo anota en la Bitácora.
async function aplicar(s, { b, que, abiertos, est }, ruta, nombre) {
  const ahora = new Date().toISOString();
  if (que === "foto" || que === "cedula") {
    await s.from("viajes_buzos").update(buzoAFila(que === "foto" ? { foto: ruta } : { docFoto: ruta })).eq("id", b.id);
    // En sus cursos abiertos, ese paso queda Listo.
    const paso = que === "foto" ? "foto" : "identificacion";
    for (const x of abiertos.filter((y) => y.estado === "curso" && (y.pasos || {})[paso] === "pendiente")) {
      await s.from("est_estudiantes").update({ pasos: { ...x.pasos, [paso]: "listo" }, actualizado_en: ahora }).eq("id", x.id);
    }
  } else if (que === "certificacion") {
    // V64 ("281"): queda en su ficha; vuelve a "sin revisar" hasta que la tienda la vea.
    const { error } = await s.from("viajes_buzos").update({ cert_foto: ruta, cert_revisada_en: null, cert_revisada_por: null }).eq("id", b.id);
    if (!error) await avisarBuceos(s, "perfil", { titulo: "Subió su certificación", texto: b.nombre, ruta: `/viajes-buceos/buzos/${b.id}` });
  } else if (que === "comprobante") {
    const ext = ruta.split(".").pop();
    const c = { ruta, nombre: String(nombre || `comprobante.${ext}`).slice(0, 80), en: ahora, via: "link" };
    await s.from("est_estudiantes").update({ comprobantes: [...(est.comprobantes || []), c], actualizado_en: ahora }).eq("id", est.id);
    // V54: aviso en la campanita ("62. si").
    await avisarEquipoEst(s, { permiso: "pagos", titulo: "Comprobante de pago nuevo", texto: `${b.nombre}${est.curso ? ` · ${est.curso}` : ""}`, url: `/control-estudiantes/estudiante/${est.id}` });
  } else {
    await s.from("est_estudiantes").update({ firma: ruta, actualizado_en: ahora }).eq("id", est.id);
  }
  await logLink(s, est?.id || null, `Subió ${QUE[que]} por el link: ${b.nombre}`);
}

export async function POST(request) {
  const s = createServiceClient();
  const esJson = (request.headers.get("content-type") || "").includes("application/json");

  if (esJson) {
    const body = await request.json().catch(() => ({}));
    const p = await preparar(s, body);
    if (p.error) return mal(p.error);

    if (body.accion === "firmar") {
      const ruta = `${p.carpeta}/${p.que}-${Date.now()}.${EXT[p.tipo]}`;
      const { data, error } = await s.storage.from(BUCKET).createSignedUploadUrl(ruta);
      if (error || !data?.token) return mal("No se pudo preparar la subida. Intenta de nuevo.", 500);
      return NextResponse.json({ ruta, token: data.token });
    }

    if (body.accion === "listo") {
      // Que sea un archivo de esta persona, de esto, y que ya esté subido.
      const ruta = String(body.ruta || "");
      const m = ruta.match(/^([^/]+)\/([a-z]+)-\d+\.([a-z]+)$/);
      if (!m || m[1] !== p.carpeta || m[2] !== p.que || m[3] !== EXT[p.tipo]) return mal("No pudimos confirmar el archivo. Intenta de nuevo.");
      const nombreArchivo = ruta.slice(p.carpeta.length + 1);
      const { data: hay } = await s.storage.from(BUCKET).list(p.carpeta, { search: nombreArchivo, limit: 5 });
      if (!(hay || []).some((x) => x.name === nombreArchivo)) return mal("El archivo no llegó. Intenta de nuevo.");
      await aplicar(s, p, ruta, body.nombre);
      return NextResponse.json({ ok: true });
    }

    return mal("Acción desconocida.");
  }

  // Lo de antes: el archivo viene en un FormData (solo sirve para archivos chicos).
  const form = await request.formData().catch(() => null);
  if (!form) return mal("No llegó el archivo.");
  const file = form.get("archivo");
  if (!file || typeof file === "string") return mal("No llegó el archivo.");
  const p = await preparar(s, { tipoDoc: form.get("tipoDoc"), doc: form.get("doc"), cel: form.get("cel"), que: form.get("que"), estudianteId: form.get("estudianteId"), tipo: file.type || "", tamano: file.size });
  if (p.error) return mal(p.error);
  const ruta = `${p.carpeta}/${p.que}-${Date.now()}.${EXT[p.tipo]}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: eSubir } = await s.storage.from(BUCKET).upload(ruta, bytes, { contentType: p.tipo, upsert: false });
  if (eSubir) return mal("No se pudo subir. Intenta de nuevo.", 500);
  await aplicar(s, p, ruta, file.name);
  return NextResponse.json({ ok: true });
}
