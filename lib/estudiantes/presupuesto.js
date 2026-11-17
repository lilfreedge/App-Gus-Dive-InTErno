// V98 (maqueta V99: "29. A por ahora", "30. sí"): presupuestos predeterminados
// de cada curso, uno por cada cantidad de estudiantes. Se guardan en
// est_cursos.info.presupuestos = { "4": { secciones: [...] }, ... } y se
// manejan en Más › Catálogo de cursos › el curso › Presupuestos.
// Una hoja = secciones con líneas { t, precio, cant } (o { t, info: true }, solo
// texto, como las yolas del sábado y el domingo). El total es la suma de todo
// ("27. va en el total").

const num = (x) => {
  const n = Number(String(x ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
};
const texto = (x, max = 80) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export function limpiarHoja(h) {
  const secciones = (Array.isArray(h?.secciones) ? h.secciones : []).slice(0, 15).map((s) => ({
    t: texto(s?.t, 60),
    lineas: (Array.isArray(s?.lineas) ? s.lineas : []).slice(0, 40).map((l) => (l?.info ? { t: texto(l.t, 120), info: true } : { t: texto(l?.t), precio: num(l?.precio), cant: num(l?.cant) })),
  }));
  return { secciones };
}

export const totalLinea = (l) => (l?.info ? 0 : num(l?.precio) * num(l?.cant));
export const totalSeccion = (s) => (s?.lineas || []).reduce((a, l) => a + totalLinea(l), 0);
export const totalHoja = (h) => (h?.secciones || []).reduce((a, s) => a + totalSeccion(s), 0);
export const seccionConMontos = (s) => (s?.lineas || []).some((l) => !l.info);
export const copiaHoja = (h) => JSON.parse(JSON.stringify(h || { secciones: [] }));

// [[n, hoja], ...] ordenado de menos a más estudiantes.
export function presupuestosDe(curso) {
  const p = curso?.info?.presupuestos;
  if (!p || typeof p !== "object") return [];
  return Object.entries(p)
    .map(([k, h]) => [Number(k), h])
    .filter(([n, h]) => Number.isInteger(n) && n > 0 && h && Array.isArray(h.secciones))
    .sort((a, b) => a[0] - b[0]);
}

// El de esa cantidad; si no hay, el más grande por debajo; si tampoco, el más chico.
export function presupuestoPara(curso, n) {
  const lista = presupuestosDe(curso);
  if (!lista.length) return null;
  const exacto = lista.find(([k]) => k === n);
  if (exacto) return { n, exacto: true, hoja: exacto[1] };
  const abajo = lista.filter(([k]) => k < n).pop();
  const [k, hoja] = abajo || lista[0];
  return { n: k, exacto: false, hoja };
}

// La hoja de Open Water que se usa hoy (la de 4 estudiantes), para empezar.
const caleta = () => [
  { t: "Entrada Parque", precio: 100, cant: 4 },
  { t: "Viaje Yola", precio: 2500, cant: 4 },
  { t: "Cargadores", precio: 200, cant: 2 },
  { t: "Parqueo", precio: 100, cant: 2 },
  { t: "Persona extra Yola", precio: 1000, cant: 1 },
];
export const HOJA_EJEMPLO = {
  secciones: [
    { t: "Piscina", lineas: [{ t: "Piscina", precio: 300, cant: 4 }] },
    { t: "Yolas", lineas: [{ t: "Sábado: 2 yolas · capacidad 8 buzos · total real 6", info: true }, { t: "Domingo: 2 yolas · capacidad 8 buzos · total real 6", info: true }] },
    { t: "La Caleta 1", lineas: caleta() },
    { t: "La Caleta 2", lineas: caleta() },
  ],
};
export const HOJA_VACIA = { secciones: [{ t: "", lineas: [{ t: "", precio: 0, cant: 1 }] }] };

// Lo que el público NO debe ver de est_cursos.info (los presupuestos son costos internos).
export function infoPublica(info) {
  if (!info || typeof info !== "object") return info || null;
  const { presupuestos, qr_instructor, ...resto } = info;
  return resto;
}
