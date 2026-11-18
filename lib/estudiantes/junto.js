// V101 (maqueta V105: "71. El nitrox viene siendo un día adicional de
// teoría", "75. sí", "76. B"): el Nitrox que se agrega con el Open Water va
// en la misma semana del Open Water, como un día más de teoría que el
// estudiante cuadra con el instructor (como el examen). Ya no queda "Sin
// fecha".
//
// No hace falta guardar nada nuevo: el Nitrox de alguien va "junto" con su
// Open Water cuando el Nitrox está en curso y sin fecha propia, y esa misma
// persona tiene un Open Water con fecha (no dado de baja). Así también sirve
// si la tienda los anota a mano. Lo que estaba en lista de espera de antes
// ("Sin fecha", estado "espera") se queda como estaba.
// Sirve en el servidor y en el navegador.

export const TEORIA_NITROX = "Teoría Nitrox";
const ES_OWD = /^open water diver$/i;
const ES_NITROX = /^nitrox$/i;
export const esOwd = (nombre) => ES_OWD.test(String(nombre || "").trim());
export const esNitrox = (nombre) => ES_NITROX.test(String(nombre || "").trim());

const nombreDe = (e) => e?.curso || "";

// El Open Water con el que va este Nitrox (o null).
export function owdDeNitrox(ests, e, nombre = nombreDe) {
  if (!e || e.estado !== "curso" || e.fechaId || !esNitrox(nombre(e))) return null;
  return (ests || []).find((x) => x.id !== e.id && x.buzoId === e.buzoId && x.fechaId && x.estado !== "cancelado" && esOwd(nombre(x))) || null;
}

// El Nitrox que va con este Open Water (o null).
export function nitroxDeOwd(ests, e, nombre = nombreDe) {
  if (!e || !e.fechaId || e.estado === "cancelado" || !esOwd(nombre(e))) return null;
  return (ests || []).find((x) => x.id !== e.id && x.buzoId === e.buzoId && x.estado === "curso" && !x.fechaId && esNitrox(nombre(x))) || null;
}

// Dónde va la fila de la teoría de Nitrox en el itinerario: después del
// examen (o al final si el curso no tiene examen). Devuelve el índice de la
// actividad después de la cual va.
export function posTeoriaNitrox(items) {
  const i = (items || []).findIndex((x) => /^examen/i.test(String(x.t || x.texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim()));
  return i >= 0 ? i : (items || []).length - 1;
}
