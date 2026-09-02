// Formatea fechas siempre en la zona horaria de Santo Domingo (UTC-4, sin
// horario de verano), sin importar en qué zona horaria esté el navegador
// del usuario ni el servidor.
export function formatFecha(iso) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatFechaCorta(iso) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
