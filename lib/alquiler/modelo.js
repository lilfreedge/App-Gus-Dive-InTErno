// App Alquiler (migration_82.sql) -- las reglas, en un solo lugar.
//
// Pedidos del 2-nov-2026:
//  - Prefijos: Reguladores RE, Caretas CA, BCD BC, Chapaletas CH, Cinturón
//    CI, Bolsos BOL, Wetsuit WE, Tanques T, Tanques NITROX TX.
//  - "los artículos se alquilan por 3 días": si se lo lleva el lunes, lo
//    disfruta lunes, martes y miércoles, y lo devuelve el jueves.
//  - Alquiler doble: 6 días al doble del precio, "no más de ahí"; "132. no
//    permitir alquiler doble los lunes".
//  - Si no lo devuelve: mora diaria del 10% del valor del alquiler, por
//    artículo ("130"), desde el día siguiente al de devolver ("131. sí").

export const TIPOS = [
  { p: "RE", t: "Reguladores", uno: "Regulador", fuente: "reguladores" },
  { p: "CA", t: "Caretas", uno: "Careta", fuente: "otros" },
  { p: "BC", t: "BCD", uno: "BCD", fuente: "otros" },
  { p: "CH", t: "Chapaletas", uno: "Chapaletas", fuente: "otros" },
  { p: "CI", t: "Cinturones", uno: "Cinturón", fuente: "otros" },
  { p: "BOL", t: "Bolsos", uno: "Bolso", fuente: "otros" },
  { p: "WE", t: "Wetsuits", uno: "Wetsuit", fuente: "otros" },
  { p: "T", t: "Tanques", uno: "Tanque", fuente: "tanques" },
  { p: "TX", t: "Tanques NITROX", uno: "Tanque NITROX", fuente: "tanques" },
];

export const MORA_POR_DIA = 0.1; // 10% del precio del alquiler (3 días), por artículo
export const DIAS_NORMAL = 3;

export const rd = (n) => "RD$ " + Math.round(Number(n) || 0).toLocaleString("en-US");

// "re4", "RE 4", "re-04" -> "RE-4". Si no tiene número, lo deja como vino.
export function normalizarCodigo(txt) {
  const t = String(txt || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();
  const m = t.match(/^([A-Z]+)-?0*(\d+)$/);
  return m ? `${m[1]}-${m[2]}` : t;
}

export function prefijoDe(codigo) {
  const m = String(codigo || "").match(/^([A-Z]+)/i);
  return m ? m[1].toUpperCase() : "";
}

export const tipoDe = (codigo) => TIPOS.find((x) => x.p === prefijoDe(codigo)) || null;

// Fechas sin horas (YYYY-MM-DD), en hora de República Dominicana.
export const hoyISO = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
export function sumarDias(iso, n) {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d + n));
  return f.toISOString().slice(0, 10);
}
export function diasEntre(desde, hasta) {
  const a = Date.UTC(...desde.split("-").map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  const b = Date.UTC(...hasta.split("-").map((x, i) => (i === 1 ? Number(x) - 1 : Number(x))));
  return Math.round((b - a) / 86400000);
}
export const diaSemana = (iso) => new Date(iso + "T12:00:00Z").getUTCDay(); // 0 domingo, 1 lunes
export const esLunes = (iso) => diaSemana(iso) === 1;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MES3 = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaLarga(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${DIAS[diaSemana(iso)]} ${d} de ${MESES[m - 1]}`;
}
export function fechaCorta(iso) {
  if (!iso) return "";
  const [, m, d] = iso.split("-").map(Number);
  return `${DIAS[diaSemana(iso)].slice(0, 3)} ${d} ${MES3[m - 1]}`;
}

export const devolverDe = (fecha, dias) => sumarDias(fecha, dias);

// La mora de una línea: días después del día de devolver, por el 10% del
// precio de 3 días. Si ya se devolvió, se cuenta hasta ese día.
export function moraDe(item, alquiler, hoy = hoyISO()) {
  if (item.devueltoEn && item.mora != null) return { dias: item.moraDias || 0, monto: Number(item.mora) || 0 };
  const hasta = item.devueltoEn ? item.devueltoEn.slice(0, 10) : hoy;
  const dias = Math.max(0, diasEntre(alquiler.devolver, hasta));
  return { dias, monto: dias * Math.round(Number(item.precio || 0) * MORA_POR_DIA) };
}

// afuera | atrasado | parcial | devuelto
export function estadoDe(alquiler, hoy = hoyISO()) {
  const its = alquiler.items || [];
  const fuera = its.filter((x) => !x.devueltoEn);
  if (!fuera.length) return "devuelto";
  if (hoy > alquiler.devolver) return "atrasado";
  return fuera.length < its.length ? "parcial" : "afuera";
}
export const NOMBRE_ESTADO = { afuera: "Afuera", atrasado: "Atrasado", parcial: "Devolvió una parte", devuelto: "Devuelto" };

export const totalDe = (a) => (a.items || []).reduce((s, x) => s + Number(x.total || 0), 0);
// V62 ("233"): lo que se cobra por equipos que vinieron con problemas.
export const cargosDe = (x) => (x.cargos || []).reduce((s, c) => s + Number(c.monto || 0), 0);
export const cargosTotal = (a) => (a.items || []).reduce((s, x) => s + cargosDe(x), 0);
export const moraTotal = (a, hoy) => (a.items || []).reduce((s, x) => s + moraDe(x, a, hoy).monto, 0);
// V61: a un estudiante (equipo incluido en el curso) no se le pide factura.
export const sinFactura = (a) => !a.estudiante && !String(a.factura || "").trim();

// V58: el precio de un equipo: el suyo, o si no tiene, el de su tipo.
export function precioDe(e, preciosTipo = {}) {
  if (!e) return null;
  if (e.precio != null) return Number(e.precio);
  const t = preciosTipo[e.tipo || prefijoDe(e.codigo)];
  return t == null ? null : Number(t);
}

const MES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const nombreMes = (yyyymm) => {
  const [a, m] = yyyymm.split("-").map(Number);
  return `${MES_LARGO[m - 1]} ${a}`;
};
