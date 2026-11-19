// V100 (maqueta V102, "56. me gusta la C pero agrégale la casilla obligatoria
// que tiene la B. Me sirve ponerle hora. Las teorías empiezan a las 18:00, el
// examen varía la fecha porque normalmente el estudiante cuadra con el
// instructor, a ese no le pongas nada" + "No permitas que ninguna actividad
// choque con su fecha"): el itinerario de cada curso (cada fecha abierta).
//
// Sale del itinerario del Catálogo (los pasos del curso, `semana`: un texto
// por día desde el lunes) y se guarda en `est_fechas.itinerario`
// (migration_104) cuando se confirma o se cambia. Cada actividad:
//   { t: "Teoría 1", fecha: "2026-11-23" | null, hora: "18:00" | "", cuadrar: true si la fecha la cuadra el estudiante con el instructor }
// Sirve en el servidor y en el navegador.

export const HORA_TEORIA = "18:00";
// Cuántos días desde el lunes se pueden escoger al cambiar una fecha.
export const DIAS_PARA_ESCOGER = 14;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const esISO = (t) => /^\d{4}-\d{2}-\d{2}$/.test(String(t || ""));
const fechaObj = (iso) => new Date(`${iso}T12:00:00Z`);
export function sumarDiasISO(iso, n) {
  const d = fechaObj(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function diasEntre(desde, hasta) {
  return Math.round((fechaObj(hasta) - fechaObj(desde)) / 86400000);
}
const sinTildes = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export const esExamen = (t) => /^examen/.test(sinTildes(t));
const esTeoria = (t) => /^teoria/.test(sinTildes(t));

// "2026-11-23" → "lun 23 nov"
export function fechaCortaItinerario(iso) {
  if (!esISO(iso)) return "";
  const d = fechaObj(iso);
  return `${DIAS_CORTOS[d.getUTCDay()]} ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`;
}
export function diaLargo(iso) {
  return esISO(iso) ? DIAS[fechaObj(iso).getUTCDay()] : "";
}
// "18:00" → "6:00 p. m."
export function horaBonita(h) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(h || "").trim());
  if (!m) return "";
  const hh = Number(m[1]);
  const ampm = hh >= 12 ? "p. m." : "a. m.";
  return `${hh % 12 === 0 ? 12 : hh % 12}:${m[2]} ${ampm}`;
}

// V106 (maqueta V110, "139. sí", "140. A"): el itinerario de cada curso se
// edita en el Catálogo (Editar curso › Itinerario) y se guarda en
// `est_cursos.info.itinerario`: [{ k, t, dia: 0-13 desde el lunes | null, hora, cuadrar, pos }]
// (`pos` = el día de siempre de ese paso, para ordenar lo que va "por cuadrar").
// Vale para los cursos que todavía no tienen su itinerario guardado; los que
// ya lo confirmaron se cambian en su página (opción A).
export const DIAS_CATALOGO = 14;
export function limpiarPlantilla(p) {
  if (!Array.isArray(p)) return null;
  const out = p
    .filter((x) => x && typeof x === "object" && String(x.t || "").trim())
    .slice(0, 20)
    .map((x) => {
      const dia = Number.isInteger(x.dia) && x.dia >= 0 && x.dia < DIAS_CATALOGO ? x.dia : null;
      const cuadrar = !!x.cuadrar || dia == null;
      return {
        k: String(x.k || "").slice(0, 30),
        t: String(x.t).trim().slice(0, 60),
        dia: cuadrar ? null : dia,
        hora: !cuadrar && /^\d{1,2}:\d{2}$/.test(String(x.hora || "").trim()) ? String(x.hora).trim() : "",
        cuadrar,
        pos: Number.isFinite(Number(x.pos)) ? Number(x.pos) : dia ?? 99,
      };
    });
  return out.length ? out : null;
}
// Los textos por día (`est_cursos.semana`) que salen de la plantilla, para lo
// que todavía los usa (la duración día por día del app Gus Dive).
export function semanaDePlantilla(p) {
  const pl = limpiarPlantilla(p);
  if (!pl) return null;
  const conDia = pl.filter((x) => !x.cuadrar);
  if (!conDia.length) return null;
  const out = Array.from({ length: Math.max(...conDia.map((x) => x.dia)) + 1 }, () => "");
  conDia.forEach((x) => (out[x.dia] = x.t));
  return out;
}

// El del Catálogo, con las fechas de verdad desde el lunes en que empieza.
// V106 ("te iba a decir que al examen sea jueves"): el examen ya no sale "por
// cuadrar": va en su día del Catálogo (jueves), sin hora. En cada curso se
// puede cambiar o volver a dejar "por cuadrar" (EditorItinerario).
export function itinerarioDeCatalogo(semana, inicio, plantilla) {
  if (!esISO(inicio)) return [];
  const pl = limpiarPlantilla(plantilla);
  if (pl) {
    return pl
      .map((x, i) => ({ x, i, orden: x.cuadrar ? x.pos : x.dia }))
      .sort((a, b) => a.orden - b.orden || a.i - b.i)
      .map(({ x }) => (x.cuadrar ? { t: x.t, fecha: null, hora: "", cuadrar: true } : { t: x.t, fecha: sumarDiasISO(inicio, x.dia), hora: x.hora, cuadrar: false }));
  }
  if (!Array.isArray(semana)) return [];
  const out = [];
  semana.forEach((texto, i) => {
    const t = String(texto || "").trim();
    if (!t) return;
    out.push({ t, fecha: sumarDiasISO(inicio, i), hora: esTeoria(t) ? HORA_TEORIA : "", cuadrar: false });
  });
  return out;
}

// Deja solo lo que sirve (por si viene de la base o del navegador).
export function limpiarItinerario(items) {
  if (!Array.isArray(items)) return null;
  const out = items
    .filter((x) => x && typeof x === "object" && String(x.t || "").trim())
    .slice(0, 20)
    .map((x) => {
      const cuadrar = !!x.cuadrar;
      return {
        t: String(x.t).trim().slice(0, 60),
        fecha: !cuadrar && esISO(x.fecha) ? x.fecha : null,
        hora: !cuadrar && /^\d{1,2}:\d{2}$/.test(String(x.hora || "").trim()) ? String(x.hora).trim() : "",
        cuadrar,
      };
    });
  return out.length ? out : null;
}

// El del Catálogo para un curso (con su plantilla si la tiene).
export const itinerarioDelCurso = (curso, inicio) => itinerarioDeCatalogo(curso?.semana, inicio, curso?.info?.itinerario);

// El que vale para una fecha: el guardado; si no hay, el del Catálogo.
export function itinerarioDe(fecha, curso) {
  return limpiarItinerario(fecha?.itinerario) || itinerarioDelCurso(curso, fecha?.inicio);
}

// Índices de las actividades que caen el mismo día que otra.
export function choques(items) {
  const visto = new Map();
  const malos = new Set();
  (items || []).forEach((x, i) => {
    if (!x.fecha) return;
    if (visto.has(x.fecha)) {
      malos.add(i);
      malos.add(visto.get(x.fecha));
    } else visto.set(x.fecha, i);
  });
  return malos;
}

// Si el curso pasa a otro lunes, todo se corre los mismos días.
export function moverItinerario(items, inicioViejo, inicioNuevo) {
  const lim = limpiarItinerario(items);
  if (!lim || !esISO(inicioViejo) || !esISO(inicioNuevo) || inicioViejo === inicioNuevo) return lim;
  const n = diasEntre(inicioViejo, inicioNuevo);
  return lim.map((x) => (x.fecha ? { ...x, fecha: sumarDiasISO(x.fecha, n) } : x));
}

// Qué cambió entre dos itinerarios (para la bitácora): "Caleta 1: sáb 28 nov → dom 29 nov".
export function cambiosItinerario(antes, ahora) {
  const out = [];
  for (const x of ahora || []) {
    const a = (antes || []).find((y) => y.t === x.t);
    if (!a) continue;
    const cuando = (y) => (y.cuadrar ? "lo cuadra con el instructor" : [fechaCortaItinerario(y.fecha), horaBonita(y.hora)].filter(Boolean).join(" "));
    if (cuando(a) !== cuando(x)) out.push(`${x.t}: ${cuando(a) || "—"} → ${cuando(x) || "—"}`);
  }
  return out;
}

// Para los clientes (link de registro, app Gus Dive): con día y hora.
export function itinerarioPublico(items) {
  return (items || []).map((x) => ({ t: x.t, fecha: x.fecha || null, hora: x.hora || "", cuadrar: !!x.cuadrar }));
}
