// Control Estudiantes (migration_78.sql) -- lo que no depende de la base:
// los pasos de cada curso, en qué etapa va un estudiante, cuánto debe, los
// permisos y los textos. Lo usan las pantallas, el link del estudiante y
// el API.
//
// Sale del sheet "Control Estudiantes" (pestañas En proceso, Estudiantes
// Completo, Pend Recibir en almacén, Pendiente Procesar, Pendiente Notificar
// y DB) y de las respuestas del 1-nov-2026 (maqueta-control-estudiantes-2).
import { soloDigitos, rd, hoyISO, fechaCorta, primerNombre, fechaLarga, sumarDias, fechaObj } from "@/lib/viajes/modelo";

export { rd, hoyISO, fechaCorta, primerNombre, soloDigitos };

// Los pasos del curso, en el orden del sheet. "Descargo" ahora es "Record
// de entrenamiento" ("54. ... Cambiar descargo por 'RE' ... o simplemente
// ponemos Record de entrenamiento").
export const PASOS = [
  { k: "teoria1", t: "Teoría 1", corto: "Teoría 1" },
  { k: "teoria2", t: "Teoría 2", corto: "Teoría 2" },
  { k: "teoria3", t: "Teoría 3", corto: "Teoría 3" },
  { k: "piscina", t: "Práctica piscina", corto: "Piscina" },
  { k: "caleta1", t: "Caleta 1", corto: "Caleta 1" },
  { k: "caleta2", t: "Caleta 2", corto: "Caleta 2" },
  { k: "record", t: "Record de entrenamiento", corto: "Record de entrenamiento" },
  { k: "identificacion", t: "Copia de identificación", corto: "Identificación" },
  { k: "foto", t: "Foto", corto: "Foto" },
  { k: "equipos", t: "Entrega de equipos", corto: "Equipos" },
  { k: "gorra", t: "Gorra Gus", corto: "Gorra" },
];
export const nombrePaso = (k) => PASOS.find((p) => p.k === k)?.t || k;

export const ESTADOS_PASO = [
  { v: "listo", t: "Listo" },
  { v: "pendiente", t: "Pendiente" },
  { v: "na", t: "N/A" },
];

export const EXAMEN = [
  { v: "pendiente", t: "Pendiente" },
  { v: "aprobado", t: "Aprobado" },
  { v: "repetir", t: "Repetir" },
  { v: "reprobado", t: "Reprobado" },
  { v: "no_terminara", t: "No terminará" },
  { v: "revisar", t: "Pdte revisar" },
  { v: "na", t: "N/A" },
];
export const nombreExamen = (v) => EXAMEN.find((x) => x.v === v)?.t || v;

// V55: solo SNSI ("Borra PADI, no ofrecemos PADI. Es SNSI exclusivamente").
export const ESCUELAS = ["SNSI"];
export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

// Las etapas, de izquierda a derecha como en el sheet ("49. ... luego vamos
// puliendo").
export const ETAPAS = [
  { k: "curso", t: "Curso" },
  // V55: antes "Almacén" ("86. si"). V67 ("2. B", antes 86): "Pendiente procesar".
  { k: "almacen", t: "Pendiente procesar" },
  { k: "certificacion", t: "Certificación" },
  // V55: sin "Avisado" y "Entregada" por separado: no hay tarjeta que buscar
  // ("87. no, le llega un correo de snsi con sus datos para acceder al app
  // snsi"). Avisarle por WhatsApp lo deja terminado ("entregada" por dentro;
  // los que quedaron en "avisado" de antes cuentan igual).
  { k: "entregada", t: "Avisado" },
];
export const nombreEtapa = (k) => (k === "cancelado" ? "Cancelado" : k === "avisado" ? "Avisado" : k === "espera" ? "Lista de espera" : ETAPAS.find((e) => e.k === k)?.t || k);
export const terminado = (est) => est.estado === "entregada" || est.estado === "avisado";

// Los pasos que le tocan al estudiante según su curso (los demás son N/A).
export function pasosDe(est, curso) {
  const lista = curso?.pasos?.length ? curso.pasos : Object.keys(est.pasos || {});
  return PASOS.filter((p) => lista.includes(p.k));
}

export function pasosIniciales(curso) {
  const o = {};
  for (const p of PASOS) o[p.k] = (curso?.pasos || []).includes(p.k) ? "pendiente" : "na";
  return o;
}

export const pagado = (est) => (est.pagos || []).reduce((a, p) => a + (Number(p.monto) || 0), 0);
export const debe = (est) => (est.precio == null ? null : Math.max(0, Number(est.precio) - pagado(est)));
// "Pago" se pone en Listo solo cuando no debe nada ("50. si hazlo más
// completo. porque muchas veces pagan adelantos").
export const pagoListo = (est) => est.precio != null && Number(est.precio) > 0 && debe(est) === 0;

export function faltaDe(est, curso) {
  const f = pasosDe(est, curso)
    .filter((p) => !["listo", "na"].includes((est.pasos || {})[p.k] || "pendiente"))
    .map((p) => p.t);
  if (!pagoListo(est)) f.push(est.precio == null ? "Precio del curso" : "Pago");
  if (curso?.llevaExamen !== false && !["aprobado", "na"].includes(est.examen)) f.push("Examen");
  return f;
}
export const listoParaAlmacen = (est, curso) => est.estado === "curso" && faltaDe(est, curso).length === 0;

export function avance(est, curso) {
  const ps = pasosDe(est, curso);
  const total = ps.length + 2;
  const hechos = ps.filter((p) => ["listo", "na"].includes((est.pasos || {})[p.k])).length + (pagoListo(est) ? 1 : 0) + (["aprobado", "na"].includes(est.examen) || curso?.llevaExamen === false ? 1 : 0);
  return { hechos, total, pct: Math.round((hechos / total) * 100) };
}

export const pagoInstructorPendiente = (est) =>
  est.estado !== "cancelado" && ["almacen", "certificacion", "avisado", "entregada"].includes(est.estado) && !est.etapas?.pago_instructor;

// El mensaje de WhatsApp para avisarle que llegó su certificación ("51").
export function mensajeCertificacion(est, buzo) {
  // V55: la certificación llega por correo de la escuela, no hay que buscarla ("87").
  return `Hola ${primerNombre(buzo?.nombre) || ""}, tu certificación de ${est.curso} ya está lista. ${est.escuela || "La escuela"} te mandó un correo con tus datos para entrar a su app. Si no lo ves, revisa el correo no deseado o escríbenos. ¡Felicidades!`;
}
export const linkWhatsApp = (cel, texto) => {
  const d = soloDigitos(cel);
  const n = d.length === 10 ? `1${d}` : d;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
};

// Seguimiento: las notas que más se repiten en los comentarios del sheet.
// V54 -- Las cuentas para pagar los cursos (nota "App Gus interno", 1-nov:
// "Aqui los datos bancarios cambian"): no son las de los buceos. Mientras
// esté vacía, el link del estudiante no enseña cuentas, solo deja subir el
// comprobante. Formato: { banco, tipo, numero, moneda: "DOP" }.
// "70." (1-nov): las de Gus Dive SRL.
export const CUENTAS_CURSOS = [
  { banco: "Banco Popular", tipo: "Cuenta corriente en pesos", numero: "816761233", moneda: "DOP" },
  { banco: "Banco Popular", tipo: "Cuenta corriente en dólares", numero: "818383382", moneda: "USD" },
];
export const TITULAR_CURSOS = "Gus Dive SRL";
export const RNC_CURSOS = "130983704";

export const NOTAS_RAPIDAS = ["Le escribí para confirmar", "No contesta", "Pasará esta semana", "No tiene WhatsApp"];

// Interesados.
export const ESTADOS_INTERESADO = [
  { v: "nuevo", t: "Nuevos" },
  { v: "escribimos", t: "Le escribimos" },
  { v: "va", t: "Van a inscribirse" },
  { v: "inscrito", t: "Inscritos" },
  { v: "no", t: "No les interesó" },
];
export const FUENTES = ["Instagram", "Pasó por la tienda", "Referido", "Página web", "WhatsApp", "Otro"];

// Permisos ("47. si": como en Buceos). El Titular y los administradores
// pueden todo. V67 ("3. sí", antes 89): seis permisos nuevos y en orden, por
// sección (como en Administración). Los que ya existían antes de la V67 sin
// permiso (ver montos, ver documentos y ver la bitácora los veía todo el que
// entraba; cancelar, el que tenía Estudiantes) siguen igual hasta que se
// cambien: "defecto" es lo que vale si nunca se tocó.
export const PERMISOS_EST = [
  { k: "est_estudiantes", t: "Estudiantes", sub: "Registrar estudiantes, llenar el curso y la ficha." },
  { k: "est_documentos", t: "Ver documentos", sub: "Ver la foto, la cédula y la firma del estudiante.", defecto: true },
  { k: "est_cancelar", t: "Cancelar cursos", sub: "Usar “Cancelar este curso” en la ficha.", defecto: "est_estudiantes" },
  { k: "est_borrar", t: "Borrar estudiantes", sub: "Borrar a un estudiante del todo (con motivo y escribiendo BORRAR)." },
  { k: "est_interesados", t: "Interesados", sub: "Ver y trabajar la lista de interesados." },
  { k: "est_montos", t: "Ver montos", sub: "Ver lo que paga y lo que debe cada estudiante, sus pagos y comprobantes. Pagos y Conciliar también los dejan ver.", defecto: true },
  { k: "est_pagos", t: "Pagos", sub: "Poner el precio y registrar pagos." },
  { k: "est_conciliar", t: "Conciliar pagos", sub: "Marcar los pagos como confirmados." },
  { k: "est_almacen", t: "Procesar", sub: "Recibir, subir al Drive, mandar a procesar y la certificación." },
  { k: "est_entregar", t: "Avisar", sub: "Avisarle al estudiante que su certificación está lista." },
  { k: "est_pago_instructor", t: "Pago a instructores", sub: "Marcar el pago al instructor." },
  { k: "est_cursos", t: "Cursos y fechas", sub: "Agregar fechas a los cursos y cambiar la base de datos de cursos e instructores (borrar, solo el Titular)." },
  { k: "est_bitacora", t: "Ver la bitácora", sub: "Más › Bitácora y la bitácora de cada estudiante.", defecto: true },
  { k: "est_estadisticas", t: "Ver estadísticas", sub: "Más › Estadísticas (los montos, solo si también puede ver montos)." },
];

// Lo que vale un permiso para una persona (con su "defecto" si nunca se tocó).
export function valorPermisoEst(permisos, x) {
  const v = permisos?.[x.k];
  if (typeof v === "boolean") return v;
  if (x.defecto === true) return true;
  if (typeof x.defecto === "string") return permisos?.[x.defecto] === true;
  return false;
}

export function permisosEst(profile) {
  const todo = !!(profile?.es_titular || profile?.is_admin);
  const p = { titular: !!profile?.es_titular, admin: todo };
  for (const x of PERMISOS_EST) p[x.k.replace("est_", "")] = todo || valorPermisoEst(profile?.permisos, x);
  p.montos = p.montos || p.pagos || p.conciliar;
  return p;
}

export const fechaDeIso = (iso) => (iso ? fechaCorta(String(iso).slice(0, 10)) : "");
export const edad = (nac) => {
  if (!nac) return null;
  const [a, m, d] = String(nac).slice(0, 10).split("-").map(Number);
  const [ha, hm, hd] = hoyISO().split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
};

// ---------------------------------------------------------------- V55
// Las fechas de los cursos ("64", "71. B", "72. sí"): siempre empiezan lunes.
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
// La semana de Open Water ("79": solo Open Water por ahora; los demás cambian).
export const SEMANA_OWD = ["Teoría", "Teoría", "Teoría", "Examen", "Práctica en piscina", "Práctica en el mar", "Buceo recreativo en el mar"];

// Los próximos lunes (para escoger la fecha de un curso).
export function lunesProximos(n = 20, desde = hoyISO()) {
  const d = fechaObj(desde);
  const hasta = (8 - d.getDay()) % 7; // días hasta el próximo lunes (0 si hoy es lunes)
  const primero = sumarDias(desde, hasta);
  return Array.from({ length: n }, (_, i) => sumarDias(primero, i * 7));
}
export const fechaCursoLarga = (iso) => (iso ? fechaLarga(iso) : "");
export const fechaCursoCorta = (iso) => (iso ? `${["dom", "lun", "mar", "mié", "jue", "vie", "sáb"][fechaObj(iso).getDay()]} ${fechaCorta(iso)}` : "");

// Cuántos ocupan una fecha (los que no cancelaron) y cuántos cupos quedan.
export const ocupados = (db, fechaId) => db.estudiantes.filter((e) => e.fechaId === fechaId && e.estado !== "cancelado").length;
export const quedan = (db, f) => (f.cupo == null ? null : Math.max(0, f.cupo - ocupados(db, f.id)));
export const textoCupo = (db, f) => {
  const q = quedan(db, f);
  const o = ocupados(db, f.id);
  return f.cupo == null ? `${o} inscrito${o === 1 ? "" : "s"}` : `${o} de ${f.cupo}${q === 0 ? " · llena" : ""}`;
};
// Las fechas de un curso: las que no han empezado y las de la última semana.
export const fechasDe = (db, cursoId, { soloFuturas = false } = {}) => {
  const hoy = hoyISO();
  const desde = soloFuturas ? hoy : sumarDias(hoy, -7);
  return (db.fechas || []).filter((f) => f.cursoId === cursoId && f.activo && f.inicio >= desde).sort((a, b) => a.inicio.localeCompare(b.inicio));
};
// "Lun 16", "Mar 17"… con lo que se hace cada día.
export function semanaDe(inicio, semana) {
  if (!inicio || !Array.isArray(semana)) return [];
  return semana
    .map((texto, i) => ({ dia: `${DIAS_SEMANA[i]} ${fechaObj(sumarDias(inicio, i)).getDate()}`, texto: String(texto || "").trim() }))
    .filter((x) => x.texto);
}

// V60 (nota 2-nov): "no dejar inscribir a personas con 11 años o menos".
export function menorDe12(nac) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nac || "")) return false;
  const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const [a, m, d] = nac.split("-").map(Number);
  const [ha, hm, hd] = hoy.split("-").map(Number);
  const edad = ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
  return edad < 12;
}
