import { todasLasFilas } from "@/lib/todas-las-filas";
import { filaABuzo, buzoAFila, nuevoId } from "@/lib/viajes/datos";
import { prefijoDe } from "./modelo";

export { filaABuzo, buzoAFila, nuevoId };

// App Alquiler: de las tablas (migration_82.sql) a los objetos de las
// pantallas. Los equipos vienen de tres lugares: tanques y reguladores de
// App Interno ("128. sí") y alq_equipos para lo demás.

const deInterno = (fuente) => (r) => ({
  id: r.id,
  fuente,
  codigo: r.codigo,
  tipo: prefijoDe(r.codigo),
  descripcion: r.descripcion || "",
  precio: r.precio_alquiler == null ? null : Number(r.precio_alquiler),
  activo: r.activo !== false,
});
const deOtros = (r) => ({
  id: r.id,
  fuente: "otros",
  codigo: r.codigo,
  tipo: r.tipo || prefijoDe(r.codigo),
  descripcion: r.descripcion || "",
  precio: r.precio == null ? null : Number(r.precio),
  activo: r.activo !== false,
});

export const filaAAlquiler = (r) => ({
  id: r.id,
  numero: r.numero,
  buzoId: r.buzo_id,
  fecha: r.fecha,
  dias: r.dias || 3,
  devolver: r.devolver,
  factura: r.factura || "",
  notas: r.notas || "",
  creadoPor: r.creado_por_nombre || "",
  creadoEn: r.creado_en,
  items: [],
});
export const filaAItem = (r) => ({
  id: r.id,
  alquilerId: r.alquiler_id,
  codigo: r.codigo,
  tipo: r.tipo || prefijoDe(r.codigo),
  descripcion: r.descripcion || "",
  precio: Number(r.precio || 0),
  total: Number(r.total || 0),
  devueltoEn: r.devuelto_en || null,
  devueltoPor: r.devuelto_por || "",
  recibidoPor: r.recibido_por || "",
  moraDias: r.mora_dias,
  mora: r.mora == null ? null : Number(r.mora),
  nota: r.nota || "",
});

export async function cargarTodo(supabase) {
  const [tanques, reguladores, otros, alquileres, items, buzos, bitacora, precios] = await Promise.all([
    supabase.from("tanques_alquiler").select("*").eq("activo", true).order("codigo"),
    supabase.from("reguladores_alquiler").select("*").eq("activo", true).order("codigo"),
    supabase.from("alq_equipos").select("*").order("codigo"),
    supabase.from("alq_alquileres").select("*").order("fecha", { ascending: false }).order("creado_en", { ascending: false }).limit(2000),
    todasLasFilas(supabase, "alq_items", (q) => q.select("*")),
    todasLasFilas(supabase, "viajes_buzos", (q) => q.select("*").order("nombre")),
    supabase.from("alq_bitacora").select("*").order("creado_en", { ascending: false }).limit(600),
    // V58: precios por tipo (migration_83). Si falta, cada código con su precio.
    supabase.from("alq_precios_tipo").select("*"),
  ]);
  // Sin migration_82 todavía: el app lo dice en vez de fallar.
  const falta = !!(otros.error || alquileres.error);
  const lista = (alquileres.data || []).map(filaAAlquiler);
  const porId = Object.fromEntries(lista.map((a) => [a.id, a]));
  for (const it of (items || []).map(filaAItem)) porId[it.alquilerId]?.items.push(it);
  return {
    falta,
    equipos: [
      ...(tanques.data || []).map(deInterno("tanques")),
      ...(reguladores.data || []).map(deInterno("reguladores")),
      ...(otros.data || []).map(deOtros),
    ],
    alquileres: lista,
    preciosTipo: Object.fromEntries((precios.data || []).map((r) => [r.tipo, r.precio == null ? null : Number(r.precio)])),
    sinPreciosTipo: !!precios.error,
    buzos: (buzos || []).map(filaABuzo),
    bitacora: (bitacora.data || []).map((r) => ({ id: r.id, alquilerId: r.alquiler_id, quien: r.nombre || "", texto: r.texto, antes: r.antes, despues: r.despues, cuando: r.creado_en })),
  };
}

export const alquilerAFila = (a) => ({
  buzo_id: a.buzoId,
  fecha: a.fecha,
  dias: a.dias,
  devolver: a.devolver,
  factura: String(a.factura || "").trim() || null,
  notas: String(a.notas || "").trim() || null,
  actualizado_en: new Date().toISOString(),
});
export const itemAFila = (x, alquilerId) => ({
  id: x.id,
  alquiler_id: alquilerId,
  codigo: x.codigo,
  tipo: x.tipo,
  descripcion: x.descripcion || null,
  precio: x.precio || 0,
  total: x.total || 0,
});
