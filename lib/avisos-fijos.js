// V51 -- Avisos fijos arriba del Inicio de App Interno y de App Equipos de
// clientes (maqueta-v51-todo-junto.html; tablas en migration_76.sql).
// Funciones sin nada de servidor: las usan las pantallas y el API.
//
// Tipos ("15. si. Pero también pon una opción para poner un reminder de one
// time"):
//   fijo      sale hasta que se quite, o hasta `hasta` (ese día incluido).
//   repite    cada día, cada semana (dia_semana, 0 = domingo) o cada mes
//             (dia_mes; si el mes es más corto, el último día).
//   una_vez   sale el día `fecha`. Con "Listo" se puede escoger que siga
//             saliendo hasta que lo marquen ("21. las 2 opciones").
// Con "Listo" (pide_listo), a cada persona le sale el botón; al tocarlo se
// le quita (para esa vez) y le llega al que lo creó por celular y correo.
// Sin "Listo", el que se repite sale solo el día que toca.

export const COLORES_AVISO = [
  { v: "rojo", t: "Rojo (importante)" },
  { v: "amarillo", t: "Amarillo" },
  { v: "azul", t: "Azul (informativo)" },
];

export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Los fijos no cambian de "vez": se marcan una sola vez.
export const OCURRENCIA_FIJO = "2000-01-01";

const aFecha = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
const aISO = (d) => d.toISOString().slice(0, 10);
const diasDelMes = (anio, mes) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();

export function fechaLarga(iso) {
  if (!iso) return "";
  const d = aFecha(iso);
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`;
}

// El día (yyyy-mm-dd, hora de RD) en que se creó el aviso.
function diaCreado(aviso) {
  if (!aviso?.creado_en) return null;
  return new Date(new Date(aviso.creado_en).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

// La última vez que le tocó al aviso, hasta `hoy` (yyyy-mm-dd), o null.
export function ultimaVez(aviso, hoy) {
  if (!aviso) return null;
  if (aviso.tipo === "fijo") return OCURRENCIA_FIJO;
  if (aviso.tipo === "una_vez") return aviso.fecha && aviso.fecha <= hoy ? aviso.fecha : null;
  if (aviso.tipo !== "repite") return null;
  const d = aFecha(hoy);
  let vez = null;
  if (aviso.cada === "dia") vez = hoy;
  else if (aviso.cada === "semana" && Number.isInteger(aviso.dia_semana)) {
    const atras = (d.getUTCDay() - aviso.dia_semana + 7) % 7;
    vez = aISO(new Date(d.getTime() - atras * 86400000));
  } else if (aviso.cada === "mes" && aviso.dia_mes) {
    const anio = d.getUTCFullYear();
    const mes = d.getUTCMonth();
    const diaEste = Math.min(aviso.dia_mes, diasDelMes(anio, mes));
    if (d.getUTCDate() >= diaEste) vez = aISO(new Date(Date.UTC(anio, mes, diaEste, 12)));
    else {
      const mAnt = mes === 0 ? 11 : mes - 1;
      const aAnt = mes === 0 ? anio - 1 : anio;
      vez = aISO(new Date(Date.UTC(aAnt, mAnt, Math.min(aviso.dia_mes, diasDelMes(aAnt, mAnt)), 12)));
    }
  }
  // Una vez de antes de crear el aviso no cuenta.
  const creado = diaCreado(aviso);
  if (vez && creado && vez < creado) return null;
  return vez;
}

// ¿Le toca salir hoy? Devuelve la vez (para el "Listo") o null.
export function vezQueSale(aviso, hoy) {
  if (!aviso?.activo) return null;
  if (aviso.tipo === "fijo") return !aviso.hasta || hoy <= aviso.hasta ? OCURRENCIA_FIJO : null;
  const vez = ultimaVez(aviso, hoy);
  if (!vez) return null;
  if (vez === hoy) return vez;
  // Días después de la vez: solo si espera el "Listo".
  if (!aviso.pide_listo) return null;
  if (aviso.tipo === "una_vez") return aviso.sigue_hasta_listo ? vez : null;
  return vez; // se repite: hasta que lo marquen o hasta la próxima vez
}

// ¿Este aviso es para esta persona? Vacío = a todos menos los técnicos.
export function esParaMi(aviso, { yoId, tecnico }) {
  const para = Array.isArray(aviso?.para) ? aviso.para : [];
  if (para.length) return para.includes(yoId);
  return !tecnico;
}

// Los avisos que le salen hoy a esta persona, cada uno con su `vez`.
// `leidos`: filas de avisos_fijos_leidos de esta persona.
export function avisosQueSalen(avisos, { hoy, yoId, tecnico, leidos = [] }) {
  const marcados = new Set(leidos.map((l) => `${l.aviso_id}|${String(l.ocurrencia).slice(0, 10)}`));
  return (avisos || [])
    .filter((a) => esParaMi(a, { yoId, tecnico }))
    .map((a) => ({ ...a, vez: vezQueSale(a, hoy) }))
    .filter((a) => a.vez && !(a.pide_listo && marcados.has(`${a.id}|${a.vez}`)))
    .sort((a, b) => ["rojo", "amarillo", "azul"].indexOf(a.color) - ["rojo", "amarillo", "azul"].indexOf(b.color));
}

// "Hasta el 2 de noviembre", "Todos los lunes", "Una sola vez · 30 de octubre".
export function cuandoAviso(aviso) {
  if (!aviso) return "";
  if (aviso.tipo === "fijo") return aviso.hasta ? `Hasta el ${fechaLarga(aviso.hasta)}` : "Hasta que se quite";
  if (aviso.tipo === "una_vez") {
    const base = `Una sola vez · ${fechaLarga(aviso.fecha)}`;
    return aviso.pide_listo && aviso.sigue_hasta_listo ? `${base} (sigue hasta que lo marquen)` : base;
  }
  if (aviso.cada === "dia") return "Todos los días";
  if (aviso.cada === "semana") {
    const dia = (DIAS_SEMANA[aviso.dia_semana] || "").toLowerCase();
    return `Todos los ${aviso.dia_semana === 0 || aviso.dia_semana === 6 ? `${dia}s` : dia}`;
  }
  if (aviso.cada === "mes") return `Cada mes, el día ${aviso.dia_mes}`;
  return "";
}

export const ETIQUETA_TIPO = { fijo: "Fijo", repite: "Se repite", una_vez: "Una sola vez" };

// ¿Esta persona entra a ese app? (para "a todos" y para la lista de
// personas al escoger). El Operativo entra a App Interno.
export function entraAlApp(p, app) {
  if (!p || p.eliminado_en) return false;
  if (p.es_titular) return true;
  if (app === "interno") return !!p.permisos?.acceso_app_interno || !!p.permisos?.rol_operativo;
  return !!p.permisos?.equipos_clientes;
}

export const esTecnicoPerfil = (p) => !!p && !p.es_titular && !p.is_admin && !!p.permisos?.rol_tecnico;

// A quién le sale (sin contar al que lo creó): los escogidos, o todos los
// del app menos los técnicos.
export function destinatarios(aviso, perfiles) {
  const para = Array.isArray(aviso?.para) ? aviso.para : [];
  return (perfiles || []).filter(
    (p) =>
      !p.eliminado_en &&
      p.id !== aviso.creado_por &&
      (para.length ? para.includes(p.id) : entraAlApp(p, aviso.app) && !esTecnicoPerfil(p))
  );
}
