import { hoyISO } from "@/lib/viajes/modelo";
import { limpiarItinerario } from "./itinerario";

// V55 -- Las fechas próximas de los cursos para el link del estudiante (lado
// del servidor, con la llave de servicio): cuántos cupos quedan en cada una.
// Si falta migration_80.sql, devuelve { conFechas: false } y el link sigue
// como antes.
export async function fechasProximas(s, cursoIds) {
  const hoy = hoyISO();
  // V100: con su itinerario (migration_104); si la columna no existe todavía, sin él.
  let { data: fechas, error } = await s.from("est_fechas").select("id, curso_id, inicio, cupo, itinerario").eq("activo", true).gte("inicio", hoy).order("inicio");
  if (error) ({ data: fechas, error } = await s.from("est_fechas").select("id, curso_id, inicio, cupo").eq("activo", true).gte("inicio", hoy).order("inicio"));
  if (error) return { conFechas: false, porCurso: {} };
  const ids = (fechas || []).map((f) => f.id);
  const ocup = {};
  if (ids.length) {
    const { data: ests } = await s.from("est_estudiantes").select("fecha_id, estado").in("fecha_id", ids);
    for (const e of ests || []) if (e.estado !== "cancelado") ocup[e.fecha_id] = (ocup[e.fecha_id] || 0) + 1;
  }
  const porCurso = {};
  for (const f of fechas || []) {
    if (cursoIds && !cursoIds.includes(f.curso_id)) continue;
    (porCurso[f.curso_id] = porCurso[f.curso_id] || []).push({ id: f.id, inicio: f.inicio, quedan: f.cupo == null ? null : Math.max(0, f.cupo - (ocup[f.id] || 0)), itinerario: limpiarItinerario(f.itinerario) });
  }
  return { conFechas: true, porCurso };
}
