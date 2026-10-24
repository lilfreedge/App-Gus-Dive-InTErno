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

// V32: las inspecciones visuales de NUESTROS tanques pasan a ser cada 2 años
// (pedido explícito: "cada 2 años", solo tanques internos -- los de clientes
// no se tocan). Vence el último día del mes, 24 meses después.
export const MESES_INSPECCION_TANQUE = 24;
export const MESES_HIDROSTATICA = 60;

export function proximaInspeccion(fechaISO) {
  return finDeMesMasMeses(String(fechaISO || "").slice(0, 7), MESES_INSPECCION_TANQUE);
}

export function proximoMantenimiento(fechaISO) {
  return sumarMeses(fechaISO, 8);
}

// Fecha de hoy en formato yyyy-mm-dd, lista para comparar contra columnas
// `date` (proxima_inspeccion, proximo_mantenimiento).
export function hoyISO() {
  // V37: hora de República Dominicana (UTC-4 todo el año). Antes usaba la
  // hora UTC, y después de las 8 de la noche ya daba el día siguiente.
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

// V31: "aaaa-mm" (mes y año, sin día) → último día de ese mes + N meses,
// en yyyy-mm-dd. Mismo criterio que la próxima hidrostática de
// migration_54.sql (vence a fin de mes). Ej.: ("2021-07", 60) → "2026-07-31".
export function finDeMesMasMeses(mesAnio, meses) {
  const [a, m] = String(mesAnio || "").split("-").map(Number);
  if (!a || !m) return null;
  // Día 0 del mes siguiente = último día del mes buscado.
  const d = new Date(Date.UTC(a, m - 1 + meses + 1, 0));
  return d.toISOString().slice(0, 10);
}

// V32: el "aaaa-mm" de la última inspección/prueba a partir de la PRÓXIMA
// fecha guardada (próxima = fin de mes + N meses) -- para precargar Editar
// tanque, que guarda la próxima y no la última.
export function mesAnioMenosMeses(fechaISO, meses) {
  const [a, m] = String(fechaISO || "").slice(0, 7).split("-").map(Number);
  if (!a || !m) return "";
  const d = new Date(Date.UTC(a, m - 1 - meses, 1));
  return d.toISOString().slice(0, 7);
}
