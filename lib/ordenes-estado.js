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
// "Status" (el selector manual que unía "En espera" y "Reparación")
// desapareció por completo (26-sep-2026, pedido explícito: "quita esa
// seccion"). Reparación pasa a detectarse sola según el servicio
// (que_se_hara), igual que ya hacía Prueba hidrostática desde el
// 23-sep -- y, como con hidrostática, lo que hace avanzar el estado es
// que YA se haya enviado (fecha_envio puesta), no solo que el servicio
// lo mencione: `envio_a` se sigue guardando (por compatibilidad/vistas
// viejas) pero ya no es la señal real. "En espera" es un check aparte y
// no hace avanzar el estado por sí solo -- mismo criterio de siempre.
export function calcularEstadoOrden(orden) {
  if (orden.fecha_entrega_cliente) return "Entregado";
  if (orden.fecha_listo_entrega) return "Pendiente por despachar";
  if (orden.fecha_retorno_tienda || orden.fecha_envio || orden.fecha_envio_hidrostatica) return "En proceso";
  return "Pendiente por trabajar";
}
