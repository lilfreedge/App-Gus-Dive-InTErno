// Fechas automáticas de "próxima inspección"/"próximo mantenimiento".
// Hasta V28 se calculaban aquí en la app cada vez que se registraba una
// inspección visual o un mantenimiento de regulador (migration_07.sql);
// desde V29 las pone la base de datos al registrar (migration_53.sql --
// así funciona también para quien no puede editar el catálogo). Estas
// funciones se siguen usando al crear un tanque/regulador en el catálogo.
export function sumarMeses(fechaISO, meses) {
  const d = new Date(fechaISO);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10); // yyyy-mm-dd, listo para una columna `date`
}

export function proximaInspeccion(fechaISO) {
  return sumarMeses(fechaISO, 12);
}

export function proximoMantenimiento(fechaISO) {
  return sumarMeses(fechaISO, 8);
}

// Fecha de hoy en formato yyyy-mm-dd, lista para comparar contra columnas
// `date` (proxima_inspeccion, proximo_mantenimiento).
export function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

// Suma días (no meses) a una fecha yyyy-mm-dd -- usado para el aviso de
// "vence pronto" (ítem 14 del feedback de v16, 22-sep-2026: tanques a los
// que les falten 2 semanas para su próxima inspección).
export function sumarDias(fechaISO, dias) {
  const d = new Date(fechaISO);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Fecha de HOY según el reloj del dispositivo (no UTC), para dejarla puesta
// por default en un campo de fecha que llena la persona (V29, Pruebas
// hidrostáticas). hoyISO() usa UTC: de noche, en nuestra zona horaria, ya
// sería "mañana". Solo usar en el navegador (en un useEffect), nunca en el
// servidor.
export function hoyLocalISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
