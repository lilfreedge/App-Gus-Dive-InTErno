import { formatFechaDDMMAAAADeDate } from "./format";
import { tipoEquipoLabel } from "./tipo-equipo";

// Filas "Campo / Antes / Después" de una edición de ordenes_equipos --
// extraído de app/app-clientes/administracion/historial/page.js
// (27-sep-2026) para poder reutilizarlo también en "Bitácora movimientos
// en órdenes" (pedido explícito: "un boton en 'mas'... un registro de
// todas las veces que cualquier orden es editada... para enterarme quien
// cambio que en cada orden") sin duplicar esta lista de campos en dos
// archivos y arriesgar que se desincronicen. `dn` (datos_nuevos) puede
// venir vacío en ediciones de antes de migration_29.sql.
export function filasOrden(d, dn) {
  const f = (iso) => (iso ? formatFechaDDMMAAAADeDate(iso) : "—");
  return [
    { label: "No. de orden", antes: d.no_orden_fisico ?? "—", despues: dn?.no_orden_fisico ?? "—" },
    { label: "Cliente", antes: d.cliente_nombre_snapshot || "—", despues: dn?.cliente_nombre_snapshot || "—" },
    {
      label: "Equipo",
      antes: tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "—",
      despues: dn ? tipoEquipoLabel(dn.tipo_equipo, dn.tipo_equipo_otro) || "—" : "—",
    },
    { label: "Servicio a realizar", antes: d.que_se_hara || "—", despues: dn?.que_se_hara || "—" },
    { label: "Envío a", antes: d.envio_a || "—", despues: dn?.envio_a || "—" },
    { label: "Fecha de retorno a tienda", antes: f(d.fecha_retorno_tienda), despues: dn ? f(dn.fecha_retorno_tienda) : "—" },
    { label: "Fecha de listo para entrega", antes: f(d.fecha_listo_entrega), despues: dn ? f(dn.fecha_listo_entrega) : "—" },
    { label: "Verificado por", antes: d.verificado_por || "—", despues: dn?.verificado_por || "—" },
    { label: "Fecha de entrega al cliente", antes: f(d.fecha_entrega_cliente), despues: dn ? f(dn.fecha_entrega_cliente) : "—" },
    { label: "Nombre de quien recibe", antes: d.nombre_recibe || "—", despues: dn?.nombre_recibe || "—" },
    { label: "Factura", antes: d.factura || "—", despues: dn?.factura || "—" },
    { label: "Repuestos utilizados", antes: d.repuestos_usados || "—", despues: dn?.repuestos_usados || "—" },
    { label: "Estado", antes: d.estado || "—", despues: dn?.estado || "—" },
  ];
}
