// Fechas automáticas de "próxima inspección"/"próximo mantenimiento" —
// se calculan aquí en la app (no con un trigger de base de datos) cada
// vez que se registra una inspección visual o un mantenimiento de
// regulador. Ver supabase/migration_07.sql.
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
