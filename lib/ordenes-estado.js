import { requiereVerificacion } from "./procesos-ordenes";

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
// viejas) pero ya no es la señal real.
//
// "En Hold" (feedback sobre v40, pedido explícito: "si la orden esta en
// hold, el estado deberia ser 'en hold'. y que no figure en 'ordenes
// pendientes por trabajar' en inicio, ahora mismo esta ahi y en hold al
// mismo tiempo. no debe de ser") -- antes un Hold activo solo se veía
// como un badge/columna aparte (en_espera), sin tocar `estado`, así que
// una orden podía verse "Pendiente por trabajar" Y "En Hold" a la vez.
// Ahora, mientras haya un Hold activo, ese ES el estado (por encima de
// Pendiente por trabajar/En proceso/Pendiente por despachar) -- así deja
// de listarse en esas otras secciones/pestañas mientras dure, sin
// necesitar un filtro aparte en Inicio/Registro (ambos ya filtran por
// `estado`). Entregado sigue por encima de todo: si de algún modo quedó
// un Hold sin resolver en una orden ya entregada, no la reabre.
// V114 (pedido explícito, con foto de la ficha de la orden 2206: "órdenes que
// estén pendientes por verificar, donde dice pendiente por despachar, pon
// Pendiente por verificar para despachar") -- solo cambia lo que se VE: en la
// base el estado sigue siendo "Pendiente por despachar" (los filtros de
// Inicio, Registro y las notificaciones no cambian). Mismo criterio que el
// Inicio: sin "Verificado por" y con ese paso activo para el tipo de equipo
// (Procesos órdenes, `ajustes_app_clientes`).
export const ESTADO_POR_VERIFICAR = "Pendiente por verificar para despachar";
export function estadoParaVer(orden, ajustes) {
  if (orden?.estado === "Pendiente por despachar" && !orden.verificado_por && requiereVerificacion(ajustes, orden.tipo_equipo)) {
    return ESTADO_POR_VERIFICAR;
  }
  return orden?.estado;
}

// V115 (maqueta V114 aprobada: "217. A" / "218. Sí"; pedido: "para clientes
// que tienen varias órdenes, al momento que haya una lista para entregar y
// otra que aún no esté lista, a la orden que está lista debería aparecerle un
// pequeño banner... así la tienda no lo contacta hasta que esté listo todo lo
// del cliente"). "Lista" = se ve como "Pendiente por despachar" (ya
// verificada, o sin ese paso). "Le falta" = otra orden abierta del mismo
// cliente que todavía no está lista (por trabajar, en proceso, Hold,
// hidrostática, reparación o por verificar).
export const CAMPOS_FALTAN =
  "id, folio, no_orden_fisico, cliente_id, tipo_equipo, estado, verificado_por, fecha_envio, fecha_envio_hidrostatica, fecha_retorno_tienda";

export function estaListaParaEntregar(orden, ajustes) {
  return estadoParaVer(orden, ajustes) === "Pendiente por despachar";
}

// En qué está una orden, en minúscula, para la frase del aviso.
export function dondeEstaOrden(orden, ajustes) {
  const est = estadoParaVer(orden, ajustes) || "";
  if (est === "En proceso" && !orden.fecha_retorno_tienda) {
    if (orden.fecha_envio_hidrostatica) return "en prueba hidrostática";
    if (orden.fecha_envio) return "en reparación";
  }
  if (est === "En Hold") return "en Hold";
  return est.charAt(0).toLowerCase() + est.slice(1);
}

// Las otras órdenes del mismo cliente que todavía no están listas (vacío si
// la orden no está lista o no tiene cliente).
export function ordenesQueFaltan(orden, abiertas, ajustes) {
  if (!orden?.cliente_id || !estaListaParaEntregar(orden, ajustes)) return [];
  const numero = (o) => Number(String(o.no_orden_fisico ?? o.folio ?? "").replace(/\D/g, "")) || 0;
  return (abiertas || [])
    .filter(
      (x) =>
        x.id !== orden.id &&
        x.cliente_id === orden.cliente_id &&
        x.estado !== "Entregado" &&
        !estaListaParaEntregar(x, ajustes)
    )
    .sort((a, b) => numero(a) - numero(b))
    .map((x) => ({ id: x.id, numero: x.no_orden_fisico ?? x.folio, donde: dondeEstaOrden(x, ajustes) }));
}

export function calcularEstadoOrden(orden) {
  if (orden.fecha_entrega_cliente) return "Entregado";
  if ((orden.holds || []).some((h) => h.activo)) return "En Hold";
  if (orden.fecha_listo_entrega) return "Pendiente por despachar";
  if (orden.fecha_retorno_tienda || orden.fecha_envio || orden.fecha_envio_hidrostatica) return "En proceso";
  return "Pendiente por trabajar";
}

// BUG corregido (item 27, 27-sep-2026): "esHidrostatica"/"esReparacion" se
// calculaban en 3 archivos distintos con `.toLowerCase().includes("hidrostat")`
// -- funciona con texto escrito a mano ("prueba hidrostatica", sin tilde),
// pero el Catálogo de servicios (Base de datos > Servicios) guarda el
// nombre EXACTO tal como se escribió ahí, con tilde: "Prueba Hidrostática".
// ".toLowerCase()" no quita tildes, así que "hidrostática" (con á) nunca
// hacía match con el substring "hidrostat" (con a) -- por eso una orden de
// Tanque con ese servicio elegido DEL CATÁLOGO no mostraba los campos de
// fecha de envío/retorno de prueba hidrostática en "Actualizar estado de
// orden". Reportado en vivo: "al momento de actualizar un tanque que esta
// registrado para prueba hidrostatica, no me sale la opcion de poner fecha
// de enviado y retorno de prueba" -- confirmado con una orden nueva,
// servicio elegido de la lista (no escrito en "Otro").
//
// Arreglo: quitar tildes antes de comparar (normalize + quitar diacríticos),
// centralizado acá para que los 3 lugares que lo usan (esta ficha, el
// formulario de "Actualizar estado de orden" y el Reporte de Reguladores)
// nunca se vuelvan a desincronizar entre sí.
function quitarTildes(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function esServicioHidrostatica(queSeHara) {
  return quitarTildes(queSeHara).includes("hidrostat");
}

export function esServicioReparacion(queSeHara) {
  return quitarTildes(queSeHara).includes("reparaci");
}

// V109 (pedido explícito: "si se pone que es un mantenimiento... en códigos
// a cobrar salga automáticamente... REG-5126. Esto solo para los
// reguladores"): al registrar una orden de un regulador con el servicio
// Mantenimiento, Códigos a cobrar arranca con este código (ver
// app/app-clientes/ordenes/nueva).
export const CODIGO_MANTENIMIENTO_REGULADOR = "REG-5126";
export const NOMBRE_MANTENIMIENTO_REGULADOR = "MANTENIMIENTO REGULADOR";

export function esServicioMantenimiento(queSeHara) {
  return quitarTildes(queSeHara).includes("mantenimiento");
}
