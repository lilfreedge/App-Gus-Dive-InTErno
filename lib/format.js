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

// Solo la fecha (sin hora), misma zona horaria.
export function formatFechaSolo(iso) {
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Fecha en formato DD/MM/AAAA, misma zona horaria — usada en la columna
// "Fecha" de la tabla de Reportes (pantalla, PDF y Excel). Los reportes ya
// no tienen una columna "Fecha de registro" separada: en la práctica
// siempre son el mismo valor porque la app no permite registrar con fecha
// atrasada, así que se colapsaron en una sola columna "Fecha" con este
// formato.
export function formatFechaDDMMAAAA(iso) {
  const partes = new Intl.DateTimeFormat("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date(iso));
  const get = (tipo) => partes.find((p) => p.type === tipo)?.value || "";
  return `${get("day")}/${get("month")}/${get("year")}`;
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
