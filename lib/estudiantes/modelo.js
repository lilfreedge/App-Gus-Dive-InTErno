// Control Estudiantes (migration_78.sql) -- lo que no depende de la base:
// los pasos de cada curso, en qué etapa va un estudiante, cuánto debe, los
// permisos y los textos. Lo usan las pantallas, el link del estudiante y
// el API.
//
// Sale del sheet "Control Estudiantes" (pestañas En proceso, Estudiantes
// Completo, Pend Recibir en almacén, Pendiente Procesar, Pendiente Notificar
// y DB) y de las respuestas del 1-nov-2026 (maqueta-control-estudiantes-2).
import { soloDigitos, rd, hoyISO, fechaCorta, primerNombre } from "@/lib/viajes/modelo";

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

export const ESCUELAS = ["SNSI", "PADI"];
export const FORMAS_PAGO = ["Efectivo", "Transferencia", "Tarjeta", "Otro"];

// Las etapas, de izquierda a derecha como en el sheet ("49. ... luego vamos
// puliendo").
export const ETAPAS = [
  { k: "curso", t: "Curso" },
  { k: "almacen", t: "Almacén" },
  { k: "certificacion", t: "Certificación" },
  { k: "avisado", t: "Avisado" },
  { k: "entregada", t: "Entregada" },
];
export const nombreEtapa = (k) => (k === "cancelado" ? "Cancelado" : ETAPAS.find((e) => e.k === k)?.t || k);

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
  return `Hola ${primerNombre(buzo?.nombre) || ""}, tu certificación de ${est.curso} ya está lista. Puedes pasar a buscarla a Gus Dive Center. ¡Felicidades!`;
}
export const linkWhatsApp = (cel, texto) => {
  const d = soloDigitos(cel);
  const n = d.length === 10 ? `1${d}` : d;
  return `https://wa.me/${n}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
};

// Seguimiento: las notas que más se repiten en los comentarios del sheet.
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
// pueden todo.
export const PERMISOS_EST = [
  { k: "est_estudiantes", t: "Estudiantes", sub: "Registrar estudiantes, llenar el curso y la ficha." },
  { k: "est_pagos", t: "Pagos", sub: "Poner el precio y registrar pagos." },
  { k: "est_conciliar", t: "Conciliar pagos", sub: "Marcar los pagos como confirmados." },
  { k: "est_almacen", t: "Almacén", sub: "Recibir, subir al Drive, procesar y la certificación." },
  { k: "est_entregar", t: "Avisar y entregar", sub: "Avisarle al estudiante y marcar que la recogió." },
  { k: "est_pago_instructor", t: "Pago a instructores", sub: "Marcar el pago al instructor." },
  { k: "est_cursos", t: "Cursos", sub: "Cambiar cursos, precios, pasos e instructores." },
  { k: "est_interesados", t: "Interesados", sub: "Ver y trabajar la lista de interesados." },
];

export function permisosEst(profile) {
  const todo = !!(profile?.es_titular || profile?.is_admin);
  const p = { titular: !!profile?.es_titular, admin: todo };
  for (const x of PERMISOS_EST) p[x.k.replace("est_", "")] = todo || !!profile?.permisos?.[x.k];
  return p;
}

export const fechaDeIso = (iso) => (iso ? fechaCorta(String(iso).slice(0, 10)) : "");
export const edad = (nac) => {
  if (!nac) return null;
  const [a, m, d] = String(nac).slice(0, 10).split("-").map(Number);
  const [ha, hm, hd] = hoyISO().split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
};
