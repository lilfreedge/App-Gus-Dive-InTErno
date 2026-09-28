// "Procesos órdenes" (28-sep-2026, pedido explícito: "agrega una seccion
// de 'procesos ordenes' para quitar el paso de 'verificado por' en los
// equipos que le quite el check") -- ajuste a nivel de app (tabla
// singleton `ajustes_app_clientes`, ver migration_40.sql), no por usuario
// ni por orden: para cada tipo de equipo, decide si el paso "Verificado
// por" del Seguimiento es obligatorio antes de poder notificar al
// cliente/cerrar la orden, o si se puede saltar directo de "listo para
// entrega" a esos dos pasos.
//
// Mismos valores que TIPOS_EQUIPO (app/app-clientes/catalogo/servicios/
// nuevo/form-client.js) -- la lista se repite acá en vez de importarse de
// ahí porque ese archivo es "use client" y esta lista también la usa
// código de servidor.
export const TIPOS_EQUIPO_PROCESOS = ["Tanques", "Reguladores", "BC", "Computadora", "Compresor"];

// Sin fila en la tabla, o sin la clave de un tipo todavía no configurado
// -> se trata como que SÍ requiere verificación (comportamiento de
// siempre) -- para no cambiarle el comportamiento a nadie sin que el
// Titular lo apague a propósito, mismo criterio "hacia atrás compatible"
// que ya usa el resto de la app (esHoldFormaVieja, componentePresente).
export function requiereVerificacion(ajustes, tipoEquipo) {
  const config = ajustes?.verificacion_requerida || {};
  return config[tipoEquipo] !== false;
}
