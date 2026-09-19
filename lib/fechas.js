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
