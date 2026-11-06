import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { soloDigitos, primerNombre } from "@/lib/viajes/modelo";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";
import { buscarPorDoc } from "@/lib/estudiantes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el link "Me interesa" (para Instagram o la página
// web). V60 ("164"): primero la cédula o el pasaporte. Si ya es buzo o
// estudiante de Gus, lo saluda por su nombre y no le pide los datos otra vez;
// el interés queda ligado a esa persona. Pide el correo; ya no pide "cuándo".
//   accion "doc"    -> ¿ya lo tenemos? (solo devuelve el primer nombre)
//   accion "enviar" -> lo anota en Interesados como "Nuevo"
const tipoDe = (doc) => (/^\d{11}$/.test(soloDigitos(doc)) && !/[a-z]/i.test(doc) ? "cedula" : "pasaporte");
const docOk = (doc) => {
  const t = tipoDe(doc);
  return t === "cedula" ? true : String(doc || "").replace(/[\s-]/g, "").length >= 6;
};
const docGuardar = (doc) => (tipoDe(doc) === "cedula" ? soloDigitos(doc) : String(doc || "").replace(/\s/g, "").toUpperCase());

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // Trampa para robots: un campo escondido que una persona nunca llena.
  if (body.web) return NextResponse.json({ ok: true });
  const s = createServiceClient();
  const doc = String(body.doc || "").trim();
  if (!docOk(doc)) return NextResponse.json({ error: "Escribe tu cédula (11 números) o tu pasaporte." }, { status: 400 });
  const b = await buscarPorDoc(s, tipoDe(doc), doc);
  const persona = b && !b.staff ? b : null;

  if (body.accion === "doc") return NextResponse.json({ encontrado: !!persona, primer: persona ? primerNombre(persona.nombre) : "" });

  const nombre = persona ? persona.nombre : String(body.nombre || "").trim().slice(0, 120);
  const cel = persona ? soloDigitos(persona.cel) : soloDigitos(body.cel);
  const correo = String(body.correo || "").trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!persona && cel.length !== 10) return NextResponse.json({ error: "Escribe tu celular completo (10 números)." }, { status: 400 });
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  const curso = String(body.curso || "").slice(0, 80) || null;

  // Si ya dejó sus datos hace poco (misma persona, documento o celular), no se repite.
  const abiertos = ["nuevo", "escribimos", "va"];
  const docG = docGuardar(doc);
  let { data: ya, error: eYa } = await s.from("est_interesados").select("id").eq("documento", docG).in("estado", abiertos).limit(1);
  if (eYa) ya = null; // sin la migration_86 todavía
  if (!ya?.length && cel.length === 10) ({ data: ya } = await s.from("est_interesados").select("id").eq("celular", cel).in("estado", abiertos).limit(1));
  if (ya?.length) return NextResponse.json({ ok: true, ya: true, nombre: primerNombre(nombre) });

  const fila = { nombre, celular: cel.length === 10 ? cel : null, curso, fuente: "Link", via: "link" };
  let { error } = await s.from("est_interesados").insert({ ...fila, buzo_id: persona?.id || null, documento: docG, correo: correo || null });
  // Sin la migration_86 todavía: se guarda sin esas columnas (el documento va en la nota).
  if (error && /buzo_id|documento|correo|column/i.test(error.message || "")) ({ error } = await s.from("est_interesados").insert({ ...fila, nota: `Documento: ${docG}${correo ? ` · ${correo}` : ""}` }));
  if (error) return NextResponse.json({ error: "No se pudo enviar. Intenta de nuevo." }, { status: 500 });
  // Si ya es buzo y no teníamos su correo, se llena (nunca se cambia lo que ya estaba).
  if (persona && correo && !persona.correo) await s.from("viajes_buzos").update({ correo }).eq("id", persona.id);
  await s.from("est_bitacora").insert({ nombre: "Link", texto: `Dejó sus datos en "Me interesa": ${nombre}${curso ? ` (${curso})` : ""}${persona ? " · ya es buzo de Gus" : ""}` });
  await avisarEquipoEst(s, { permiso: "interesados", titulo: "Interesado nuevo", texto: `${nombre}${curso ? ` · ${curso}` : ""}`, url: "/control-estudiantes/interesados" });
  return NextResponse.json({ ok: true, nombre: primerNombre(nombre) });
}
