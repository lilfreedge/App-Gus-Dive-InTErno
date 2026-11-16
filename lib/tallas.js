// V93 (maqueta v93, aprobada): tallas de calzado y de camisa, y peso en lbs del
// cliente. Se guardan en viajes_buzos.tallas (jsonb), junto a BCD, wetsuit y
// chapaletas. Así se llenan en cualquier momento y los ve el staff.

// Calzado: se escoge la talla EU y se muestra su equivalente US. La tabla es
// general; si la tienda usa otra, se cambia aquí y listo.
export const CALZADO_EU = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47];
const US_DE_EU = { 35: 4, 36: 5, 37: 6, 38: 7, 39: 7.5, 40: 8, 41: 9, 42: 9.5, 43: 10, 44: 11, 45: 11.5, 46: 12, 47: 13 };
export const textoCalzado = (eu) => (eu ? `EU ${eu} · US ${US_DE_EU[Number(eu)] ?? "—"}` : "");

export const CAMISA = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];

export const PESO_MIN = 50;
export const PESO_MAX = 500;

// Lee las tallas guardadas (aunque falte alguna).
export function tallasDe(b) {
  const t = b?.tallas || {};
  return {
    calzado: t.calzado ? String(t.calzado) : "",
    camisa: t.camisa ? String(t.camisa) : "",
    peso: t.peso_lbs ? String(t.peso_lbs) : "",
  };
}

// Qué le falta llenar al cliente: lista de nombres ("calzado", "camisa", "peso").
export function faltanTallas(b) {
  const t = tallasDe(b);
  return [!t.calzado && "calzado", !t.camisa && "camisa", !t.peso && "peso"].filter(Boolean);
}

// Valida lo que manda el cliente. Devuelve { error } o { valor } ya limpio.
export function limpiarTallas(n = {}) {
  const calzado = n.calzado ? Number(n.calzado) : null;
  if (calzado !== null && !CALZADO_EU.includes(calzado)) return { error: "Esa talla de calzado no existe." };
  const camisa = n.camisa ? String(n.camisa) : null;
  if (camisa !== null && !CAMISA.includes(camisa)) return { error: "Esa talla de camisa no existe." };
  const peso = n.peso_lbs === "" || n.peso_lbs == null ? null : Number(n.peso_lbs);
  if (peso !== null && (!Number.isFinite(peso) || peso < PESO_MIN || peso > PESO_MAX)) return { error: `El peso tiene que estar entre ${PESO_MIN} y ${PESO_MAX} lbs.` };
  return { valor: { calzado, camisa, peso_lbs: peso } };
}
