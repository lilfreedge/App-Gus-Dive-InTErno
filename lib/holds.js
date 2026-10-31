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
  return consultasDe(hold).length > 1 ? "Consultas al cliente" : "Consulta al cliente";
}

// V50 (nota "App Gus interno": "Quiero hacer que los holds sean tipo bullets y
// que cada cosa tenga su respuesta... Puse un hold consultando dos cosas y me
// respondieron solo 'sí'"). Un Hold nuevo trae `consultas`: una lista de
// { texto, respuesta: null | "si" | "no", comentario }. La orden sigue en Hold
// hasta que todas tengan respuesta ("1. sí"). Los Holds de antes (una sola
// consulta, o la forma vieja de tipo/componente) se leen como una lista de
// un solo punto, con su decisión como respuesta.
function textoUnico(hold) {
  if (esHoldFormaVieja(hold)) {
    if (hold.tipo === "cambio_componente") {
      if (!hold.componente) return hold.motivo || "Autorización para cambio de componente";
      return hold.motivo ? `Cambiar: ${hold.componente} — ${hold.motivo}` : `Cambiar: ${hold.componente}`;
    }
    return hold.motivo || "Otro";
  }
  return hold.codigo ? `${hold.consulta} — Código ${hold.codigo}` : hold.consulta || "Consulta al cliente";
}

export function consultasDe(hold) {
  if (!hold) return [];
  if (Array.isArray(hold.consultas)) {
    return hold.consultas.map((c) => ({ texto: c.texto || "", respuesta: c.respuesta || null, comentario: c.comentario || null }));
  }
  return [{ texto: textoUnico(hold), respuesta: hold.decision || null, comentario: hold.decision_nota || null }];
}

const textoRespuesta = (c) => (c.respuesta ? `${c.respuesta === "si" ? "Sí" : "No"}${c.comentario ? ` — ${c.comentario}` : ""}` : "");

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
  if (Array.isArray(hold.consultas)) {
    const cs = hold.consultas;
    return cs.length === 1 ? cs[0].texto : cs.map((c, i) => `${i + 1}. ${c.texto}`).join(" · ");
  }
  return hold.consulta || "Consulta al cliente";
}

// Detalle completo (item 46, pedido explícito, mid-flow, con captura de
// pantalla de la Bitácora: "que aparezca todo el detalle") -- a
// diferencia de resumenHold(), este SÍ incluye el código de la pieza (o,
// en la forma vieja, el "¿por qué?" opcional junto al componente).
export function detalleHold(hold) {
  if (!hold) return "";
  if (!Array.isArray(hold.consultas)) return textoUnico(hold);
  const cs = consultasDe(hold);
  return cs
    .map((c, i) => `${cs.length > 1 ? `${i + 1}. ` : ""}${c.texto}${c.respuesta ? ` (${textoRespuesta(c)})` : ""}`)
    .join(" · ");
}

// Las respuestas, en una línea (para la Bitácora).
export function respuestasHoldTexto(hold) {
  const cs = consultasDe(hold);
  return cs.map((c, i) => `${cs.length > 1 ? `${i + 1}. ` : ""}${textoRespuesta(c) || "Sin respuesta"}`).join(" · ");
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
export function crearHold({ consultas, consulta }) {
  const textos = (consultas || [consulta]).map((t) => String(t || "").trim()).filter(Boolean);
  return {
    id: nuevoId(),
    consultas: textos.map((texto) => ({ texto, respuesta: null, comentario: null })),
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
export function editarHold(hold, { consultas }) {
  // Si una consulta queda igual, conserva la respuesta que ya tenía.
  const antes = consultasDe(hold);
  const textos = (consultas || []).map((t) => String(t || "").trim()).filter(Boolean);
  return {
    id: hold.id,
    consultas: textos.map((texto) => {
      const igual = antes.find((c) => c.texto === texto);
      return { texto, respuesta: igual?.respuesta || null, comentario: igual?.comentario || null };
    }),
    fecha_inicio: hold.fecha_inicio,
    fecha_resolucion: hold.fecha_resolucion,
    decision: hold.decision,
    decision_nota: hold.decision_nota,
    activo: hold.activo,
  };
}

// V50 -- Guarda lo que contestó el cliente en cada consulta. Si ya están
// todas contestadas, el Hold se resuelve (la orden sale de Hold); si falta
// alguna, sigue activo. `respuestas` va en el mismo orden que consultasDe().
export function responderHold(hold, respuestas) {
  const consultas = consultasDe(hold).map((c, i) => ({
    texto: c.texto,
    respuesta: respuestas?.[i]?.respuesta || null,
    comentario: String(respuestas?.[i]?.comentario || "").trim() || null,
  }));
  const todas = consultas.length > 0 && consultas.every((c) => c.respuesta);
  const decision = !todas
    ? null
    : consultas.every((c) => c.respuesta === "si")
    ? "si"
    : consultas.every((c) => c.respuesta === "no")
    ? "no"
    : "mixto";
  return {
    id: hold.id,
    consultas,
    fecha_inicio: hold.fecha_inicio,
    fecha_resolucion: todas ? hoyISO() : null,
    decision,
    decision_nota: null,
    activo: !todas,
  };
}
