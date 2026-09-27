import { hoyISO } from "./fechas";

// Hold: pausa una orden mientras se espera una decisión del cliente
// (por ejemplo, autorizar el cambio de una pieza). Se guarda el
// historial completo (activo + resueltos) en un solo jsonb array en la
// orden (holds), igual que notificaciones_cliente.
//
// Unificado (item 33, ronda grande de feedback, 27-sep-2026, pedido
// explícito: "unifica las 2 preguntas del modal en una sola pregunta, y
// agrega un campo opcional de código de la pieza") -- el modal de "Poner
// en Hold" ya NO pregunta un "tipo" (antes: "Autorización para cambio de
// componente" vs "Otro", cada uno con sus propios campos). Ahora es una
// sola pregunta obligatoria ("Consulta para el cliente") + un campo
// opcional ("Código de la pieza").
//
// Compatibilidad con Holds viejos: cualquier Hold guardado ANTES de este
// cambio tiene la forma vieja {tipo, componente, motivo} (sin `consulta`
// ni `codigo`) -- puede haber una orden real con un Hold de esa forma
// todavía ACTIVO al momento de este deploy. Los datos viejos NO se
// migran, solo se leen con retrocompatibilidad: todas las funciones de
// abajo detectan la forma (`esHoldFormaVieja`) y saben resumir/detallar
// ambas correctamente.
export function esHoldFormaVieja(hold) {
  return !!hold && hold.tipo != null;
}

// Encabezado corto para el banner "EN HOLD -- ..." (ficha de la orden y
// "Actualizar estado de orden").
export function labelTipoHold(hold) {
  if (!hold) return "Hold";
  if (esHoldFormaVieja(hold)) {
    return hold.tipo === "cambio_componente" ? "Autorización para cambio de componente" : "Otro";
  }
  return "Consulta al cliente";
}

export function holdActivo(holds) {
  return (holds || []).find((h) => h.activo) || null;
}

export function diasEnHold(hold) {
  if (!hold?.fecha_inicio) return null;
  return Math.floor((Date.now() - new Date(hold.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
}

// Resumen corto (uso en el badge/motivo_espera de Inicio -- ahí conviene
// que quede corto).
export function resumenHold(hold) {
  if (!hold) return "";
  if (esHoldFormaVieja(hold)) {
    if (hold.tipo === "cambio_componente") {
      return hold.componente ? `Cambiar: ${hold.componente}` : "Autorización para cambio de componente";
    }
    return hold.motivo || "Otro";
  }
  return hold.consulta || "Consulta al cliente";
}

// Detalle completo (item 46, pedido explícito, mid-flow, con captura de
// pantalla de la Bitácora: "que aparezca todo el detalle") -- a
// diferencia de resumenHold(), este SÍ incluye el código de la pieza (o,
// en la forma vieja, el "¿por qué?" opcional junto al componente).
export function detalleHold(hold) {
  if (!hold) return "";
  if (esHoldFormaVieja(hold)) {
    if (hold.tipo === "cambio_componente") {
      if (!hold.componente) return hold.motivo || "Autorización para cambio de componente";
      return hold.motivo ? `Cambiar: ${hold.componente} — ${hold.motivo}` : `Cambiar: ${hold.componente}`;
    }
    return hold.motivo || "Otro";
  }
  return hold.codigo ? `${hold.consulta} — Código ${hold.codigo}` : hold.consulta || "Consulta al cliente";
}

// Texto para auto-rellenar "Repuestos utilizados" cuando el cliente
// autoriza el cambio (decisión "Sí") -- funciona con las dos formas.
export function textoAutorizacionHold(hold) {
  if (!hold) return "Autorizado por el cliente";
  if (esHoldFormaVieja(hold)) {
    return hold.componente ? `Cambiar: ${hold.componente}` : hold.motivo || "Autorizado por el cliente";
  }
  return hold.codigo ? `Código ${hold.codigo}` : hold.consulta || "Autorizado por el cliente";
}

function nuevoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Nuevos Holds ya se crean solo en la forma nueva -- `tipo`/`componente`/
// `motivo` desaparecen para Holds nuevos (se quedan solo en los viejos ya
// guardados, ver esHoldFormaVieja arriba).
export function crearHold({ consulta, codigo }) {
  return {
    id: nuevoId(),
    consulta: (consulta || "").trim(),
    codigo: (codigo || "").trim() || null,
    fecha_inicio: hoyISO(),
    fecha_resolucion: null,
    decision: null,
    decision_nota: null,
    activo: true,
  };
}

export function resolverHold(hold, { decision, decisionNota }) {
  return {
    ...hold,
    fecha_resolucion: hoyISO(),
    decision,
    decision_nota: (decisionNota || "").trim() || null,
    activo: false,
  };
}

// Editar un Hold ya activo (feedback sobre v40, pedido explícito: "agrega
// permiso para editar Hold ya creado") -- exclusivo de Administradores
// (equipos_clientes_editar_hold). Solo cambia consulta/código; el resto
// (id, fechas, decisión) se conserva igual. Si el Hold que se edita
// todavía estaba en la forma vieja (tipo/componente/motivo, ver
// esHoldFormaVieja arriba), queda normalizado a la forma nueva -- el
// modal de edición solo tiene los 2 campos nuevos, así que no tendría
// sentido dejar los campos viejos sueltos y desactualizados.
export function editarHold(hold, { consulta, codigo }) {
  return {
    id: hold.id,
    consulta: (consulta || "").trim(),
    codigo: (codigo || "").trim() || null,
    fecha_inicio: hold.fecha_inicio,
    fecha_resolucion: hold.fecha_resolucion,
    decision: hold.decision,
    decision_nota: hold.decision_nota,
    activo: hold.activo,
  };
}
