// El estado de una orden ya no se avanza a mano con un botón -- se
// calcula solo según qué campos de seguimiento ya están llenos (pedido
// explícito del usuario, 23-sep-2026: "no sé de qué manera vamos a
// alimentar las demás cosas" / "lo del dashboard todo se alimenta según
// el status de la orden"). Se recalcula en la app (mismo criterio que
// proxima_inspeccion/proximo_mantenimiento: no hay trigger de base de
// datos) cada vez que se guardan cambios en /app-clientes/ordenes/[id]/editar.
//
// Sin "fecha de entrega al cliente" todavía -> abierta (Pendiente por
// trabajar o Pendiente por despachar, según si ya está "lista"). Con esa
// fecha -> Entregado/cerrada, sale de Registro y pasa a Historial.
// "Envío a" se unificó con "En espera" en un solo campo "Status"
// (23-sep-2026, pedido explícito) y "Prueba hidrostática" dejó de ser un
// valor de ese campo -- ahora se activa solo según el servicio
// (que_se_hara) y tiene su propia fecha (fecha_envio_hidrostatica),
// independiente de envio_a. "En espera" (Status) no hace avanzar el
// estado por sí solo -- mismo criterio que ya tenía antes de este
// cambio, cuando en_espera era un campo aparte que tampoco entraba aquí.
export function calcularEstadoOrden(orden) {
  if (orden.fecha_entrega_cliente) return "Entregado";
  if (orden.fecha_listo_entrega) return "Pendiente por despachar";
  if (orden.fecha_retorno_tienda || orden.envio_a === "Reparación" || orden.fecha_envio_hidrostatica) return "En proceso";
  return "Pendiente por trabajar";
}
