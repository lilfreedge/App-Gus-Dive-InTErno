// V37 -- Cosas compartidas de los mantenimientos de compresores.

// Nivel de aceite (pedido explícito: "nivel de aceite ponle un dropdown de
// selección, no que escriban nada porque eso no se mide"; maqueta 1B). Se
// anota como se encontró en la mirilla, antes de echarle. Los registros
// viejos tienen texto libre y se quedan como están.
export const NIVELES_ACEITE = [
  { valor: "Lleno", label: "Lleno (en el máximo)" },
  { valor: "Bien", label: "Bien (entre mínimo y máximo)" },
  { valor: "Bajo", label: "Bajo (en el mínimo)" },
  { valor: "Muy bajo", label: "Muy bajo (debajo del mínimo)" },
];

// Posición en la gráfica (0 = arriba). null si es un texto viejo.
export function indiceAceite(valor) {
  const i = NIVELES_ACEITE.findIndex((n) => n.valor === valor);
  return i === -1 ? null : i;
}

// Clase del badge para cada nivel.
export function claseAceite(valor) {
  const i = indiceAceite(valor);
  if (i === null) return "";
  if (i <= 1) return "badge-verde";
  if (i === 2) return "badge-amarillo";
  return "badge-rojo";
}

// ¿El horómetro guardado es distinto del que leyó la foto? (alguien lo
// cambió a mano -- en el historial sale marcado con ✎).
export function horometroCorregido(m) {
  if (m?.horometro_leido === null || m?.horometro_leido === undefined) return false;
  return Number(m.horometro_leido) !== Number(m.horometro);
}

// Último horómetro registrado de cada compresor: { [compresorId]: { horometro, fecha } }.
export function ultimosHorometros(mantenimientos) {
  const res = {};
  for (const m of mantenimientos || []) {
    if (!m.compresor_id || m.horometro === null || m.horometro === undefined) continue;
    const h = Number(m.horometro);
    if (!res[m.compresor_id] || h > res[m.compresor_id].horometro) {
      res[m.compresor_id] = { horometro: h, fecha: m.fecha };
    }
  }
  return res;
}

export function formatHoras(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  const v = Number(n);
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}
