import { registrarCambio } from "@/lib/audit-client";
import { calcularEstadoOrden, esServicioHidrostatica, esServicioReparacion } from "@/lib/ordenes-estado";
import { crearHold, resumenHold, holdActivo } from "@/lib/holds";
import { hoyISO } from "@/lib/fechas";

// V38 -- Lo que el técnico hace con una orden desde su menú (app/tecnico).
// Misma lógica y misma bitácora que "Actualizar estado de orden"
// (app/app-clientes/ordenes/[id]/editar/form-client.js): cada cambio se
// anota en cambios_historial con el antes y el después, y el estado se
// recalcula solo (lib/ordenes-estado.js).

// Guarda `cambios` en la orden y devuelve la orden ya actualizada.
export async function guardarOrden(supabase, orden, cambios) {
  const combinado = { ...orden, ...cambios };
  const estado = calcularEstadoOrden(combinado);
  const final = { ...cambios, estado, updated_at: new Date().toISOString() };

  await registrarCambio(supabase, {
    tabla: "ordenes_equipos",
    registroId: orden.id,
    accion: "editar",
    datosAnteriores: orden,
    datosNuevos: { ...combinado, estado },
  });

  const { data, error } = await supabase.from("ordenes_equipos").update(final).eq("id", orden.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("No tienes permiso para cambiar esta orden.");
  return { ...orden, ...final };
}

// Lista de códigos a cobrar de una orden (las órdenes viejas solo tienen el
// texto separado por comas).
export function codigosDe(orden) {
  if (Array.isArray(orden.repuestos_usados_detalle) && orden.repuestos_usados_detalle.length > 0) {
    return orden.repuestos_usados_detalle;
  }
  return (orden.repuestos_usados || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean)
    .map((nombre) => ({ nombre, origen: "manual" }));
}

export function camposCodigos(lista) {
  return {
    repuestos_usados_detalle: lista,
    repuestos_usados: lista.map((r) => r.nombre).join(", ") || null,
  };
}

export const etiquetaPieza = (p) => (p.codigo ? `${p.codigo} · ${p.nombre}` : p.nombre);

// Códigos de la Base de datos que van con ese tipo de equipo (los que no
// tienen tipo asignado van con todos) -- mismo filtro que el wizard.
export function piezasDelEquipo(piezas, tipoEquipo) {
  return (piezas || []).filter(
    (p) => !p.tipos_equipo || p.tipos_equipo.length === 0 || (tipoEquipo && p.tipos_equipo.includes(tipoEquipo))
  );
}

// ¿Puede el técnico poner "listo" ya? Devuelve null si sí, o el motivo.
export function motivoNoListo(orden) {
  if (holdActivo(orden.holds)) return "La orden está en Hold: espera la respuesta del cliente.";
  if (orden.tipo_equipo === "Reguladores" && !orden.informe_mantenimiento) {
    return "Primero llena el Informe de mantenimiento (paso 2)."; // V40: el informe pasó a ser el paso 2
  }
  const esReparacion = esServicioReparacion(orden.que_se_hara);
  const esHidro = esServicioHidrostatica(orden.que_se_hara);
  const trabajadoEnTienda = esReparacion && !!orden.reparacion_en_tienda;
  const muestraRetorno = (esReparacion && !trabajadoEnTienda) || esHidro;
  const nuncaSalio = esReparacion && !esHidro && !orden.fecha_envio && !orden.fecha_retorno_tienda;
  if (muestraRetorno && !orden.fecha_retorno_tienda && !nuncaSalio) {
    return "Este equipo salió de la tienda. Se pone listo cuando vuelva (la tienda pone la fecha de retorno).";
  }
  return null;
}

// Los cambios para poner la orden "lista para entrega" hoy. Si es una
// reparación que nunca salió al taller, queda "Se trabajó en tienda".
export function cambiosListo(orden) {
  const esReparacion = esServicioReparacion(orden.que_se_hara);
  const esHidro = esServicioHidrostatica(orden.que_se_hara);
  const cambios = { fecha_listo_entrega: hoyISO() };
  if (esReparacion && !esHidro && !orden.fecha_envio && !orden.fecha_retorno_tienda && !orden.reparacion_en_tienda) {
    cambios.reparacion_en_tienda = true;
  }
  return cambios;
}

// V50: varias consultas, una por punto (sin "código de la pieza").
export function cambiosHold(orden, { consultas }) {
  const nuevo = crearHold({ consultas });
  return {
    holds: [...(orden.holds || []), nuevo],
    en_espera: true,
    motivo_espera: resumenHold(nuevo),
  };
}

// Texto del botón de "listo" según el servicio.
export function textoListo(orden) {
  if (esServicioReparacion(orden.que_se_hara)) return "Reparación lista";
  const s = (orden.que_se_hara || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return s.includes("mantenimiento") ? "Mantenimiento listo" : "Trabajo listo";
}
