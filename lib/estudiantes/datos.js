import { todasLasFilas } from "@/lib/todas-las-filas";
import { filaABuzo, buzoAFila, nuevoId } from "@/lib/viajes/datos";
import { celGuardar } from "@/lib/viajes/modelo";

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
  // V91 (maqueta v92, aprobada): info.qr_instructor (false = no pide QR al instructor).
  info: r.info && typeof r.info === "object" ? r.info : {},
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
  ...(c.info !== undefined ? { info: c.info } : {}),
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
  // V88: cuándo se pidió el presupuesto y cuándo llegó (migration_100.sql).
  presupuestoPedidoEn: r.presupuesto_pedido_en || null,
  presupuestoRealizadoEn: r.presupuesto_realizado_en || null,
  // V91: cuándo lo confirmó el instructor con el QR (migration_101.sql).
  presupuestoEntregadoEn: r.presupuesto_entregado_en || null,
  presupuestoEntregadoInfo: r.presupuesto_entregado_info || null,
  // V98 (migration_103): los presupuestos que se pidieron, con su detalle.
  presupuestoDetalle: Array.isArray(r.presupuesto_detalle) ? r.presupuesto_detalle : [],
  // V100 (maqueta V102, "56. C + la casilla de B"): el itinerario de este
  // curso y cuándo se confirmó (migration_104). `conItinerario`: si la base
  // ya tiene la columna (sin el SQL, todo sale como antes).
  itinerario: Array.isArray(r.itinerario) ? r.itinerario : null,
  itinerarioConfirmadoEn: r.itinerario_confirmado_en || null,
  conItinerario: "itinerario" in r,
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
  // V64 ("282", migration_92): el No. de factura del pago del curso (solo si la base ya lo tiene).
  ...("factura" in r ? { factura: r.factura || "" } : {}),
  estado: r.estado || "curso",
  via: r.via || "mano",
  interesadoId: r.interesado_id || null,
  creadoEn: r.creado_en,
});
const CAMPOS_EST = {
  factura: "factura",
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
  // V60 ("164"): la persona (si ya es buzo o estudiante), su documento y su correo.
  buzoId: r.buzo_id || null,
  documento: r.documento || "",
  correo: r.correo || "",
  // V62 ("245"): el seguimiento (migration_88). Si falta la columna, vacío.
  seguimiento: Array.isArray(r.seguimiento) ? r.seguimiento : [],
  sinSeguimiento: !("seguimiento" in r),
});
export function interesadoAFila(x, { sinSeguimiento = false } = {}) {
  // V78: el correo también se guarda desde el formulario del equipo.
  const m = { nombre: "nombre", cel: "celular", correo: "correo", curso: "curso", cuando: "cuando", fuente: "fuente", estado: "estado", recordar: "recordar", nota: "nota", estudianteId: "estudiante_id", via: "via" };
  const f = {};
  for (const [k, col] of Object.entries(m)) if (k in x) f[col] = x[k] === "" && ["recordar", "estudianteId", "correo"].includes(k) ? null : x[k];
  if ("cel" in x) f.celular = String(x.cel || "").replace(/\D/g, "") || null;
  if ("seguimiento" in x && !sinSeguimiento) f.seguimiento = x.seguimiento || [];
  if ("id" in x) f.id = x.id;
  f.actualizado_en = new Date().toISOString();
  return f;
}

export const filaABitacora = (r) => ({ id: r.id, estudianteId: r.estudiante_id, quien: r.nombre || "", texto: r.texto, antes: r.antes, despues: r.despues, cuando: r.creado_en });

// V111 (maqueta V112, "161. A"): un interesado abierto cuyo celular ya es de
// alguien inscrito en ESE mismo curso (con fecha o ya terminado) deja de salir
// en Interesados y en los contadores: se trata como "inscrito" (no se cambia
// nada en la base hasta que alguien lo guarde). Los menores (con tutor) usan
// el celular de quien los registró: no cuentan.
const ESTADOS_INSCRITO = ["curso", "espera", "almacen", "certificacion", "avisado", "entregada"];
export function marcarYaInscritos(interesados, estudiantes, buzos, cursos) {
  const celDe = new Map(buzos.filter((b) => !b.tutor && !b.staff && b.cel).map((b) => [b.id, celGuardar(b.cel)]));
  const nombreCurso = new Map(cursos.map((c) => [c.id, c.nombre]));
  const claves = new Set();
  for (const e of estudiantes) {
    if (!ESTADOS_INSCRITO.includes(e.estado)) continue;
    const cel = celDe.get(e.buzoId);
    const curso = nombreCurso.get(e.cursoId) || e.curso;
    if (cel && curso) claves.add(`${curso}|${cel}`);
  }
  return interesados.map((x) =>
    x.curso && x.cel && !["inscrito", "no"].includes(x.estado) && claves.has(`${x.curso}|${celGuardar(x.cel)}`) ? { ...x, estado: "inscrito", yaEstudiante: true } : x
  );
}

export async function cargarTodo(supabase, { conInteresados }) {
  const [cursos, instructores, estudiantes, buzos, interesados, bitacora, fechas, viajes, conIt] = await Promise.all([
    supabase.from("est_cursos").select("*").order("orden").order("nombre"),
    supabase.from("est_instructores").select("*").order("orden").order("nombre"),
    todasLasFilas(supabase, "est_estudiantes", (q) => q.select("*").order("creado_en", { ascending: false })),
    todasLasFilas(supabase, "viajes_buzos", (q) => q.select("*").order("nombre")),
    conInteresados ? supabase.from("est_interesados").select("*").order("creado_en", { ascending: false }) : Promise.resolve({ data: [] }),
    supabase.from("est_bitacora").select("*").order("creado_en", { ascending: false }).limit(800),
    // V55: si falta migration_80, sin fechas (no falla).
    supabase.from("est_fechas").select("*").order("inicio"),
    // V59 ("161"): los buceos, para el calendario (migration_85 da el permiso).
    supabase.from("viajes").select("id, nombre, fecha, estado").order("fecha"),
    // V100: si ya se corrió migration_104 (el itinerario de cada curso).
    supabase.from("est_fechas").select("itinerario").limit(1),
  ]);
  const error = cursos.error || instructores.error;
  if (error) throw error;
  const listaCursos = (cursos.data || []).map(filaACurso);
  const listaEst = estudiantes.map(filaAEst);
  const listaBuzos = buzos.map(filaABuzo);
  return {
    cursos: listaCursos,
    instructores: (instructores.data || []).map((r) => ({ id: r.id, nombre: r.nombre, activo: r.activo !== false, orden: r.orden || 0 })),
    estudiantes: listaEst,
    buzos: listaBuzos,
    interesados: marcarYaInscritos((interesados.data || []).map(filaAInteresado), listaEst, listaBuzos, listaCursos),
    bitacora: (bitacora.data || []).map(filaABitacora),
    fechas: fechas.error ? [] : (fechas.data || []).map(filaAFecha).map((f) => ({ ...f, conItinerario: !conIt.error })),
    conItinerario: !conIt.error,
    sinFechas: !!fechas.error,
    viajes: viajes.error ? [] : viajes.data || [],
    sinViajes: !!viajes.error,
  };
}
