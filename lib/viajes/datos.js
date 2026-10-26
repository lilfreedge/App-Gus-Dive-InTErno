import { todasLasFilas } from "@/lib/todas-las-filas";
import { formatoCedula, soloDigitos } from "@/lib/viajes/modelo";

// V42 -- Viajes/Buceos: de las tablas de Supabase (migration_71.sql) a los
// objetos que usan las pantallas, y de vuelta. Los nombres de los objetos
// son los de la maqueta (opcionId, usaAbono, …); los de la base, en
// español con guion bajo.

const PLANTILLA_VACIA = {
  salida: "",
  moneda: "DOP",
  tasa: 62,
  cupoMin: 0,
  cupoMax: 12,
  operador: "",
  opciones: [],
  equipo: { modo: "no", nota: "" },
  extras: [],
  preguntas: [],
  reserva: null,
  habitaciones: null,
  requisito: "",
  pendientes: [],
  recordatorios: [],
  mensajeGrupo: "",
};

export const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

// ---------------------------------------------------------------- catálogo
export const filaACatalogo = (r) => ({ ...PLANTILLA_VACIA, ...(r.datos || {}), id: r.id, nombre: r.nombre, orden: r.orden, activo: r.activo });
export function catalogoAFila(c) {
  const { id, nombre, orden, activo, pendientesTexto, ...datos } = c;
  return { nombre, datos };
}

// ---------------------------------------------------------------- viajes
export const filaAViaje = (r) => ({
  ...PLANTILLA_VACIA,
  pendientes: [],
  recordatorios: [],
  gastos: [],
  ...(r.datos || {}),
  id: r.id,
  plantilla: r.catalogo_id,
  nombre: r.nombre,
  fecha: r.fecha,
  estado: r.estado,
  web: r.web,
  slug: r.slug,
  creado: r.creado_en ? String(r.creado_en).slice(0, 10) : "",
});
export function viajeAFila(v) {
  const { id, plantilla, nombre, fecha, estado, web, slug, creado, pendientesTexto, orden, activo, ...datos } = v;
  return { catalogo_id: plantilla || null, nombre, fecha, estado, web, slug, datos };
}

// ---------------------------------------------------------------- buzos
export const filaABuzo = (r) => ({
  id: r.id,
  nombre: r.nombre,
  doc: r.documento || "",
  pasaporte: r.pasaporte || "",
  cel: r.celular || "",
  correo: r.correo || "",
  agencia: r.agencia || "",
  nivel: r.nivel || "",
  cert: r.certificacion || "",
  tallas: r.tallas || {},
  emergencia: r.emergencia || "",
  abono: Number(r.abono) || 0,
  staff: !!r.es_staff,
  notas: r.notas || "",
});
export function buzoAFila(b) {
  const f = {};
  if ("nombre" in b) f.nombre = b.nombre;
  if ("doc" in b) f.documento = b.doc ? formatoCedula(b.doc) : null;
  if ("pasaporte" in b) f.pasaporte = b.pasaporte ? String(b.pasaporte).toUpperCase().replace(/\s/g, "") : null;
  if ("cel" in b) f.celular = soloDigitos(b.cel) || null;
  if ("correo" in b) f.correo = b.correo || null;
  if ("agencia" in b) f.agencia = b.agencia || null;
  if ("nivel" in b) f.nivel = b.nivel || null;
  if ("cert" in b) f.certificacion = b.cert || null;
  if ("tallas" in b) f.tallas = b.tallas || {};
  if ("emergencia" in b) f.emergencia = b.emergencia || null;
  if ("abono" in b) f.abono = b.abono || 0;
  if ("staff" in b) f.es_staff = !!b.staff;
  if ("notas" in b) f.notas = b.notas || null;
  if ("id" in b) f.id = b.id;
  return f;
}

// ---------------------------------------------------------------- inscripciones
export const filaAIns = (r) => ({
  id: r.id,
  viajeId: r.viaje_id,
  buzoId: r.buzo_id,
  opcionId: r.opcion_id,
  rol: r.rol,
  equipo: r.equipo || { piezas: [], donde: "" },
  extras: r.extras || [],
  respuestas: r.respuestas || {},
  estado: r.estado,
  grupo: !!r.grupo,
  pagos: r.pagos || [],
  comprobantes: r.comprobantes || [],
  usaAbono: !!r.usa_abono,
  pagadoPor: r.pagado_por || "",
  asistio: r.asistio,
  nota: r.nota || "",
  nuevo: !!r.nuevo,
  inscritoPor: r.inscrito_por || "",
  habitacion: r.habitacion || "",
  via: r.via,
  codigo: r.codigo || "",
  creado: r.creado_en,
});
const CAMPOS_INS = {
  viajeId: "viaje_id",
  buzoId: "buzo_id",
  opcionId: "opcion_id",
  rol: "rol",
  equipo: "equipo",
  extras: "extras",
  respuestas: "respuestas",
  estado: "estado",
  grupo: "grupo",
  pagos: "pagos",
  comprobantes: "comprobantes",
  usaAbono: "usa_abono",
  pagadoPor: "pagado_por",
  asistio: "asistio",
  nota: "nota",
  nuevo: "nuevo",
  inscritoPor: "inscrito_por",
  habitacion: "habitacion",
  via: "via",
  codigo: "codigo",
  id: "id",
};
export function insAFila(cambios) {
  const f = {};
  for (const [k, v] of Object.entries(cambios)) {
    if (!(k in CAMPOS_INS)) continue;
    f[CAMPOS_INS[k]] = ["pagadoPor", "inscritoPor"].includes(k) ? v || null : v;
  }
  return f;
}

// ---------------------------------------------------------------- bitácora
const dosDig = (n) => String(n).padStart(2, "0");
export function cuandoLocal(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${dosDig(d.getMonth() + 1)}-${dosDig(d.getDate())} ${dosDig(d.getHours())}:${dosDig(d.getMinutes())}`;
}
export const filaABitacora = (r) => ({
  id: r.id,
  viajeId: r.viaje_id,
  cuando: cuandoLocal(r.creado_en),
  quien: r.quien,
  texto: r.texto,
  antes: r.antes,
  despues: r.despues,
});

// ---------------------------------------------------------------- todo
export async function cargarTodo(supabase, { conBitacora }) {
  const [catalogo, viajes, buzos, inscripciones, recordatorios, hechos, bitacora] = await Promise.all([
    supabase.from("viajes_catalogo").select("*").order("orden").order("nombre"),
    supabase.from("viajes").select("*").order("fecha"),
    todasLasFilas(supabase, "viajes_buzos", (q) => q.select("*").order("nombre")),
    todasLasFilas(supabase, "viajes_inscripciones", (q) => q.select("*").order("creado_en")),
    supabase.from("viajes_recordatorios").select("*").order("orden").order("creado_en"),
    supabase.from("viajes_hechos").select("clave"),
    conBitacora ? supabase.from("viajes_bitacora").select("*").order("creado_en", { ascending: false }).limit(1500) : Promise.resolve({ data: [] }),
  ]);
  const error = catalogo.error || viajes.error || recordatorios.error;
  if (error) throw error;
  return {
    catalogo: (catalogo.data || []).filter((r) => r.activo !== false).map(filaACatalogo),
    viajes: (viajes.data || []).map(filaAViaje),
    buzos: buzos.map(filaABuzo),
    inscripciones: inscripciones.map(filaAIns),
    generales: (recordatorios.data || []).filter((r) => r.tipo === "general").map((r) => ({ id: r.id, dias: r.dias, texto: r.texto, para: r.para || [], correo: !!r.correo, orden: r.orden })),
    libres: (recordatorios.data || []).filter((r) => r.tipo === "suelto").map((r) => ({ id: r.id, fecha: r.fecha, texto: r.texto, para: r.para || [], correo: !!r.correo })),
    hechos: Object.fromEntries((hechos.data || []).map((r) => [r.clave, true])),
    bitacora: (bitacora.data || []).map(filaABitacora),
  };
}

// Link público de un viaje: nombre-del-viaje-2026-11-29
export function armarSlug(nombre, fecha, existentes = []) {
  const base =
    String(nombre || "viaje")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) + `-${fecha}`;
  let s = base;
  let n = 2;
  while (existentes.includes(s)) s = `${base}-${n++}`;
  return s;
}
