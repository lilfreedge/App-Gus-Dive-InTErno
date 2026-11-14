import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { permisosEst, fechaCursoCorta } from "@/lib/estudiantes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import { primerNombre } from "@/lib/viajes/modelo";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";
import { origenDe } from "@/lib/direccion";
import { mandarCorreoInteresadoCurso, mandarCorreosInteresadoCurso } from "@/lib/correo-interesado-curso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// El link de inscripción de un interesado: la fecha (si hay) y su marca (?i=),
// con la que el app anota cuándo lo abre (V79).
const linkDe = (origen, fechaId, id) => `${origen}/estudiante?${fechaId ? `curso=${encodeURIComponent(fechaId)}&` : ""}i=${encodeURIComponent(id)}`;
const ABIERTO = (x) => !["inscrito", "no"].includes(x.estado);
const CORREO_OK = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

// V77 (pedido explícito: "al momento que le llegue ese correo que le llegue
// el URL directo para inscribirse en el curso"). Solo recibe ids: el correo,
// el nombre, el curso y el link se sacan aquí, de la base, para que este
// camino no sirva para mandar cualquier link a cualquier dirección.
//   { id }             -> a uno, desde su ficha. El link lleva la primera fecha
//                         próxima del curso con cupo; si no hay, el link normal.
//                         El seguimiento lo anota la pantalla.
//   { ids, fechaId }   -> V79 (maqueta V79, "1. B"): a varios, desde la pestaña
//                         Interesados de un curso, con el link de esa fecha.
//                         Aquí mismo se anota en el seguimiento de cada uno y
//                         en la bitácora.
export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!user || !permisosEst(profile).interesados) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const origen = origenDe(request);

  if (Array.isArray(body.ids)) {
    const ids = [...new Set(body.ids.map(String).filter(Boolean))].slice(0, 100);
    const fechaId = String(body.fechaId || "");
    if (!ids.length || !fechaId) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
    const { data: f } = await supabase.from("est_fechas").select("id, curso_id, inicio, activo").eq("id", fechaId).maybeSingle();
    if (!f || f.activo === false) return NextResponse.json({ error: "Ese curso ya no está." }, { status: 404 });
    const { data: cs } = await supabase.from("est_cursos").select("nombre").eq("id", f.curso_id).limit(1);
    const curso = cs?.[0]?.nombre || "buceo";
    const { data: filas, error } = await supabase.from("est_interesados").select("id, nombre, correo, estado, seguimiento").in("id", ids);
    if (error) return NextResponse.json({ error: "No se pudo leer la lista." }, { status: 500 });
    const para = (filas || []).filter((x) => CORREO_OK(x.correo) && ABIERTO(x));
    if (!para.length) return NextResponse.json({ error: "Ninguno de los escogidos tiene correo." }, { status: 400 });

    const ok = await mandarCorreosInteresadoCurso(para.map((x) => ({ correo: x.correo, nombre: primerNombre(x.nombre), curso, link: linkDe(origen, f.id, x.id) })));
    if (!ok) return NextResponse.json({ error: "No se pudieron mandar los correos." }, { status: 500 });

    const quien = String(profile.full_name || "").trim().split(/\s+/)[0] || "";
    const en = new Date().toISOString();
    for (const x of para) {
      const seg = Array.isArray(x.seguimiento) ? x.seguimiento : [];
      await supabase
        .from("est_interesados")
        .update({ seguimiento: [...seg, { id: nuevoId(), tipo: "link_curso", texto: "Por correo", quien, en, fechaId: f.id }], estado: "va", actualizado_en: en })
        .eq("id", x.id);
    }
    await supabase.from("est_bitacora").insert({ user_id: user.id, nombre: quien, texto: `Avisó por correo a ${para.length} interesado${para.length === 1 ? "" : "s"}: ${curso} · ${fechaCursoCorta(f.inicio)}` });
    return NextResponse.json({ ok: true, enviados: para.map((x) => x.id) });
  }

  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Falta el interesado." }, { status: 400 });

  const { data: x, error } = await supabase.from("est_interesados").select("id, nombre, curso, correo").eq("id", id).maybeSingle();
  if (error || !x) return NextResponse.json({ error: "No se encontró el interesado." }, { status: 404 });
  if (!x.correo) return NextResponse.json({ error: "Este interesado no dejó correo." }, { status: 400 });

  let fecha = null;
  if (x.curso) {
    const { data: cursos } = await supabase.from("est_cursos").select("id").eq("nombre", x.curso).eq("activo", true).limit(1);
    const cursoId = cursos?.[0]?.id;
    if (cursoId) {
      const { porCurso } = await fechasProximas(supabase, [cursoId]);
      fecha = (porCurso[cursoId] || []).find((f) => f.quedan == null || f.quedan > 0) || null;
    }
  }

  const ok = await mandarCorreoInteresadoCurso({ correo: x.correo, nombre: primerNombre(x.nombre), curso: x.curso || "buceo", link: linkDe(origen, fecha?.id, x.id) });
  if (!ok) return NextResponse.json({ error: "No se pudo mandar el correo." }, { status: 500 });
  return NextResponse.json({ ok: true, conFecha: !!fecha, fechaId: fecha?.id || null });
}
