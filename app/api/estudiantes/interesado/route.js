import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { primerNombre, celValido, celGuardar } from "@/lib/viajes/modelo";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";
import { FUENTES } from "@/lib/estudiantes/modelo";
import { TIENDA } from "@/lib/viajes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el link de interesados ("Registro de interesado",
// para Instagram o la página web). Lo anota en Interesados como "Nuevo".
// V80 (notas del 13-nov: "No pedir cédula al interesado. Ya no me interesa
// que esté vinculado para cuando se inscriban en registro de estudiante. Que
// pida el contacto") -- antes (V60) pedía la cédula o el pasaporte y lo ligaba
// con su perfil de buzo; ya no. Pide nombre, celular y correo (el correo es
// obligatorio desde la V78: ahí le llega el link del curso).
// Los estados de est_estudiantes que cuentan como "ya está en ese curso".
const EN_CURSO = ["curso", "espera"];
const TERMINADO = ["almacen", "certificacion", "avisado", "entregada"];

// ¿Ese celular es de alguien que ya está inscrito en ese curso? Los menores
// (con tutor) se guardan con el celular de quien los registró: no cuentan.
// Devuelve { nombre, curso, inicio, terminado } o null.
async function inscritoEnCurso(s, cel, curso) {
  const cels = cel.length === 10 ? [cel, `1${cel}`] : [cel];
  const { data: gente } = await s.from("viajes_buzos").select("id, nombre, tutor, es_staff").in("celular", cels);
  const ids = (gente || []).filter((b) => !b.tutor && !b.es_staff).map((b) => b.id);
  if (!ids.length) return null;
  const { data: cursos } = await s.from("est_cursos").select("id").eq("nombre", curso);
  const cursoIds = new Set((cursos || []).map((c) => c.id));
  const { data: ests } = await s.from("est_estudiantes").select("buzo_id, curso_id, curso, estado, fecha_inicio, fecha_id").in("buzo_id", ids);
  const mios = (ests || []).filter((e) => (cursoIds.has(e.curso_id) || e.curso === curso) && [...EN_CURSO, ...TERMINADO].includes(e.estado));
  if (!mios.length) return null;
  // Primero el que está en curso (el más próximo); si no, uno ya terminado.
  const activo = mios.filter((e) => EN_CURSO.includes(e.estado)).sort((a, b) => String(a.fecha_inicio || "9").localeCompare(String(b.fecha_inicio || "9")))[0];
  const e = activo || mios[0];
  const b = (gente || []).find((x) => x.id === e.buzo_id);
  return { nombre: b?.nombre || "", curso, inicio: activo ? e.fecha_inicio || null : null, terminado: !activo };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // Trampa para robots: un campo escondido que una persona nunca llena.
  if (body.web) return NextResponse.json({ ok: true });
  const s = createServiceClient();

  const nombre = String(body.nombre || "").trim().slice(0, 120);
  const cel = celGuardar(body.cel);
  const correo = String(body.correo || "").trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!celValido(body.cel)) return NextResponse.json({ error: "Escribe tu celular completo." }, { status: 400 });
  if (!correo) return NextResponse.json({ error: "Escribe tu correo." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  const curso = String(body.curso || "").slice(0, 80) || null;

  // V111 (maqueta V112, "161. A"): si ese celular ya es de alguien inscrito en
  // ESE mismo curso (con fecha o ya terminado), no se anota otra vez como
  // interesado: se le dice que ya tiene su cupo. Otro curso sí se anota.
  const yaInscrito = curso ? await inscritoEnCurso(s, cel, curso) : null;
  if (yaInscrito) return NextResponse.json({ ok: true, yaInscrito, nombre: primerNombre(yaInscrito.nombre || nombre), wa: TIENDA.whatsapp });

  // Si ya dejó sus datos hace poco (mismo celular, todavía abierto), no se repite.
  const abiertos = ["nuevo", "escribimos", "va"];
  const { data: ya } = await s.from("est_interesados").select("id").eq("celular", cel).in("estado", abiertos).limit(1);
  if (ya?.length) {
    // V78: si el registro que ya tenía no traía correo, se le pone el de ahora.
    await s.from("est_interesados").update({ correo }).eq("id", ya[0].id).is("correo", null);
    return NextResponse.json({ ok: true, ya: true, nombre: primerNombre(nombre) });
  }

  // V74: la fuente es la que escogió la persona (¿Cómo te enteraste?); si no
  // escogió nada, se queda "Link".
  // V105: con "Otro", lo que escribió va junto ("Otro: un amigo").
  const otro = String(body.fuenteOtro || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const fuente = FUENTES.includes(body.fuente) ? (body.fuente === "Otro" && otro ? `Otro: ${otro}` : body.fuente) : "Link";
  const fila = { nombre, celular: cel, curso, fuente, via: "link" };
  let { error } = await s.from("est_interesados").insert({ ...fila, correo });
  // Sin la migration_86 todavía (no existe la columna del correo): va en la nota.
  if (error && /correo|column/i.test(error.message || "")) ({ error } = await s.from("est_interesados").insert({ ...fila, nota: correo }));
  if (error) return NextResponse.json({ error: "No se pudo enviar. Intenta de nuevo." }, { status: 500 });
  await s.from("est_bitacora").insert({ nombre: "Link", texto: `Dejó sus datos en el link de interesados: ${nombre}${curso ? ` (${curso})` : ""}` });
  await avisarEquipoEst(s, { permiso: "interesados", titulo: "Interesado nuevo", texto: `${nombre}${curso ? ` · ${curso}` : ""}`, url: "/control-estudiantes/interesados" });
  return NextResponse.json({ ok: true, nombre: primerNombre(nombre) });
}
