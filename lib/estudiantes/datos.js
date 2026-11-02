import { todasLasFilas } from "@/lib/todas-las-filas";
import { filaABuzo, buzoAFila, nuevoId } from "@/lib/viajes/datos";

export { filaABuzo, buzoAFila, nuevoId };

// Control Estudiantes: de las tablas (migration_78.sql) a los objetos de las
// pantallas, y de vuelta. Las personas son las mismas de Buceos
// (viajes_buzos): "53. si y viceversa".

export const filaACurso = (r) => ({
  id: r.id,
  nombre: r.nombre,
  escuelas: Array.isArray(r.escuelas) ? r.escuelas : [],
  precio: r.precio == null ? null : Number(r.precio),
  pasos: Array.isArray(r.pasos) ? r.pasos : [],
  llevaExamen: r.lleva_examen !== false,
  activo: r.activo !== false,
  orden: r.orden || 0,
  // V55: "Cómo es la semana" (7 textos, de lunes a domingo; migration_80).
  semana: Array.isArray(r.semana) ? r.semana : null,
});
export const cursoAFila = (c) => ({
  nombre: c.nombre,
  escuelas: c.escuelas || [],
  precio: c.precio == null || c.precio === "" ? null : Number(c.precio),
  pasos: c.pasos || [],
  lleva_examen: c.llevaExamen !== false,
  activo: c.activo !== false,
  orden: c.orden || 0,
  ...(c.semana !== undefined ? { semana: Array.isArray(c.semana) && c.semana.some((x) => String(x || "").trim()) ? c.semana.map((x) => String(x || "").trim()) : null } : {}),
  actualizado_en: new Date().toISOString(),
});

// V55: las fechas de cada curso (migration_80): siempre lunes, con cupo.
export const filaAFecha = (r) => ({
  id: r.id,
  cursoId: r.curso_id,
  inicio: r.inicio,
  cupo: r.cupo == null ? null : Number(r.cupo),
  instructor: r.instructor || "",
  nota: r.nota || "",
  activo: r.activo !== false,
});
export const fechaAFila = (f) => ({
  curso_id: f.cursoId,
  inicio: f.inicio,
  cupo: f.cupo === "" || f.cupo == null ? null : Number(f.cupo),
  instructor: f.instructor || null,
  nota: f.nota || null,
  activo: f.activo !== false,
});

export const filaAEst = (r) => ({
  id: r.id,
  buzoId: r.buzo_id,
  cursoId: r.curso_id,
  curso: r.curso,
  escuela: r.escuela || "",
  instructor: r.instructor || "",
  fechaInicio: r.fecha_inicio || "",
  fechaId: r.fecha_id || null,
  buceosPrevios: r.buceos_previos,
  pasos: r.pasos || {},
  examen: r.examen || "pendiente",
  precio: r.precio == null ? null : Number(r.precio),
  pagos: r.pagos || [],
  comprobantes: r.comprobantes || [],
  etapas: r.etapas || {},
  numeroCert: r.numero_certificacion || "",
  seguimiento: r.seguimiento || [],
  firma: r.firma || "",
  estado: r.estado || "curso",
  via: r.via || "mano",
  interesadoId: r.interesado_id || null,
  creadoEn: r.creado_en,
});
const CAMPOS_EST = {
  buzoId: "buzo_id",
  cursoId: "curso_id",
  curso: "curso",
  escuela: "escuela",
  instructor: "instructor",
  fechaInicio: "fecha_inicio",
  fechaId: "fecha_id",
  buceosPrevios: "buceos_previos",
  pasos: "pasos",
  examen: "examen",
  precio: "precio",
  pagos: "pagos",
  comprobantes: "comprobantes",
  etapas: "etapas",
  numeroCert: "numero_certificacion",
  seguimiento: "seguimiento",
  firma: "firma",
  estado: "estado",
  via: "via",
  interesadoId: "interesado_id",
};
export function estAFila(e) {
  const f = {};
  for (const [k, col] of Object.entries(CAMPOS_EST)) if (k in e) f[col] = e[k] === "" && ["fechaInicio", "cursoId", "interesadoId", "fechaId"].includes(k) ? null : e[k];
  if ("id" in e) f.id = e.id;
  f.actualizado_en = new Date().toISOString();
  return f;
}

export const filaAInteresado = (r) => ({
  id: r.id,
  nombre: r.nombre,
  cel: r.celular || "",
  curso: r.curso || "",
  cuando: r.cuando || "",
  fuente: r.fuente || "",
  estado: r.estado || "nuevo",
  recordar: r.recordar || "",
  nota: r.nota || "",
  estudianteId: r.estudiante_id || null,
  via: r.via || "mano",
  creadoEn: r.creado_en,
});
export function interesadoAFila(x) {
  const m = { nombre: "nombre", cel: "celular", curso: "curso", cuando: "cuando", fuente: "fuente", estado: "estado", recordar: "recordar", nota: "nota", estudianteId: "estudiante_id", via: "via" };
  const f = {};
  for (const [k, col] of Object.entries(m)) if (k in x) f[col] = x[k] === "" && ["recordar", "estudianteId"].includes(k) ? null : x[k];
  if ("cel" in x) f.celular = String(x.cel || "").replace(/\D/g, "") || null;
  if ("id" in x) f.id = x.id;
  f.actualizado_en = new Date().toISOString();
  return f;
}

export const filaABitacora = (r) => ({ id: r.id, estudianteId: r.estudiante_id, quien: r.nombre || "", texto: r.texto, antes: r.antes, despues: r.despues, cuando: r.creado_en });

export async function cargarTodo(supabase, { conInteresados }) {
  const [cursos, instructores, estudiantes, buzos, interesados, bitacora, fechas] = await Promise.all([
    supabase.from("est_cursos").select("*").order("orden").order("nombre"),
    supabase.from("est_instructores").select("*").order("orden").order("nombre"),
    todasLasFilas(supabase, "est_estudiantes", (q) => q.select("*").order("creado_en", { ascending: false })),
    todasLasFilas(supabase, "viajes_buzos", (q) => q.select("*").order("nombre")),
    conInteresados ? supabase.from("est_interesados").select("*").order("creado_en", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("est_bitacora").select("*").order("creado_en", { ascending: false }).limit(800),
    // V55: si falta migration_80, sin fechas (no falla).
    supabase.from("est_fechas").select("*").order("inicio"),
  ]);
  const error = cursos.error || instructores.error;
  if (error) throw error;
  return {
    cursos: (cursos.data || []).map(filaACurso),
    instructores: (instructores.data || []).map((r) => ({ id: r.id, nombre: r.nombre, activo: r.activo !== false, orden: r.orden || 0 })),
    estudiantes: estudiantes.map(filaAEst),
    buzos: buzos.map(filaABuzo),
    interesados: (interesados.data || []).map(filaAInteresado),
    bitacora: (bitacora.data || []).map(filaABitacora),
    fechas: fechas.error ? [] : (fechas.data || []).map(filaAFecha),
    sinFechas: !!fechas.error,
  };
}
