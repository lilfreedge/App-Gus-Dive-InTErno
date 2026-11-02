// V55 -- Las bitácoras de Buceos por tipo (1-nov: "dentro de historial
// necesito 'bitácora de viajes', 'bitácora de inscripción' y así ... ¿qué más
// ponemos?"). Cada movimiento ya guardado se clasifica por lo que dice, así
// que sirve también para los de antes (no hace falta cambiar la base).

const sinTildes = (t) =>
  String(t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const TIPOS_BITACORA = [
  { k: "buceos", t: "Buceos", sub: "Crear, cambiar la info, abrir o cerrar la inscripción, cancelar, cerrar, borrar, y sus pendientes y recordatorios." },
  { k: "inscripciones", t: "Inscripciones", sub: "Inscribir, quitar, lista de espera, opción, habitación, equipo, grupo de WhatsApp y asistencia." },
  { k: "pagos", t: "Pagos", sub: "Pagos de los buzos, comprobantes, conciliar y abonos a favor." },
  { k: "numeros", t: "Números", sub: "Gastos reales y pago al operador." },
  { k: "buzos", t: "Buzos", sub: "Crear un buzo y cambiar sus datos." },
  { k: "catalogo", t: "Catálogo y recordatorios", sub: "El catálogo de buceos y los recordatorios generales." },
];

export function tipoBitacora(h) {
  const t = sinTildes(h.texto);
  if (/gasto real|pago al operador/.test(t)) return "numeros";
  if (/pago registrado|pago:|quito el pago|concili|comprobante|abono|pagado por otro|devolvi/.test(t)) return "pagos";
  if (/creo el buzo|edito los datos de|^guardo su/.test(t)) return "buzos";
  if (!h.viajeId && /catalogo|recordatorios generales|recordatorio nuevo \(|recordatorio hecho/.test(t)) return "catalogo";
  if (/se inscribio|^inscrito|lista de espera|asisti|asistencia|no vino|habitacion|alquila|equipo \(|^equipo|propio|grupo de whatsapp|cambio la opcion|quitado|agrego a mano|agregado a mano|quito del|llego a \d+ buzos|^nota/.test(t) && !/(abrio|cerro) la inscripcion/.test(t)) return "inscripciones";
  if (!h.viajeId) return /buceo|viaje/.test(t) ? "buceos" : "catalogo";
  return "buceos";
}

// "15:40" -> "3:40 p. m."
export function hora12(hhmm) {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (Number.isNaN(h)) return hhmm || "";
  const ap = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, "0")} ${ap}`;
}
