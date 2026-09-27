// "Hold" de una orden (App Equipos de clientes) -- reemplaza el check
// simple "En espera" (27-sep-2026, diseñado a pedido explícito tras varias
// rondas de feedback: "quitar el check de 'en espera' y poner un boton...
// necesito algo para cuando... el regulador entra en estado de espera y
// nosotros procedemos a contactar al cliente, hay veces que el cliente
// puede tardar dias en contestarnos").
//
// Se guarda como un jsonb array en ordenes_equipos.holds (ver
// migration_32.sql) -- mismo patrón que notificaciones_cliente: sin tabla
// aparte ni política RLS propia, "que la pueda ver quien sea por ahora".
// Cada orden puede tener varios holds a lo largo de su vida (se van
// resolviendo), pero solo uno puede estar activo (`activo: true`) a la
// vez -- el resto queda en el array como historial, que alimenta la
// Bitácora de la orden.
//
// Forma de un hold:
//   {
//     id: string,
//     tipo: "cambio_componente" | "otro",
//     componente: string | null,   // solo cambio_componente -- "¿qué hay que cambiar?"
//     motivo: string | null,       // "¿por qué?" (opcional) en cambio_componente; motivo único en "otro"
//     fecha_inicio: "yyyy-mm-dd",
//     fecha_resolucion: "yyyy-mm-dd" | null,
//     decision: "si" | "no" | null,     // Decisión del cliente
//     decision_nota: string | null,
//     activo: boolean,
//   }
//
// ordenes_equipos.en_espera / motivo_espera NO desaparecen -- se siguen
// llenando exactamente igual que antes (mismas columnas), solo que ahora
// se derivan del hold activo en vez de escribirse a mano desde el check
// de siempre. Así, todo lo que ya las lee (Inicio, lib/notificaciones.js,
// la ficha) sigue funcionando sin cambios.
import { hoyISO } from "./fechas";

export const TIPOS_HOLD = [
  { id: "cambio_componente", label: "Autorización para cambio de componente" },
  { id: "otro", label: "Otro" },
];

export function labelTipoHold(tipo) {
  return TIPOS_HOLD.find((t) => t.id === tipo)?.label || tipo || "Hold";
}

export function holdActivo(holds) {
  return (holds || []).find((h) => h.activo) || null;
}

// Días desde que empezó el hold (para el aviso de "lleva N días en Hold",
// mismo criterio que "días afuera" de prueba hidrostática/reparación).
export function diasEnHold(hold) {
  if (!hold?.fecha_inicio) return null;
  return Math.floor((Date.now() - new Date(hold.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
}

// Texto corto para mostrar junto al badge "En espera"/"En Hold" -- se
// guarda en motivo_espera para no romper nada que ya lo lea.
export function resumenHold(hold) {
  if (!hold) return "";
  if (hold.tipo === "cambio_componente") {
    return hold.componente ? `Cambiar: ${hold.componente}` : "Autorización para cambio de componente";
  }
  return hold.motivo || "Otro";
}

function nuevoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function crearHold({ tipo, componente, motivo }) {
  return {
    id: nuevoId(),
    tipo,
    componente: tipo === "cambio_componente" ? (componente || "").trim() || null : null,
    motivo: (motivo || "").trim() || null,
    fecha_inicio: hoyISO(),
    fecha_resolucion: null,
    decision: null,
    decision_nota: null,
    activo: true,
  };
}

// "Decisión del cliente" (Sí/No + nota opcional) cierra el hold -- no hay
// un botón aparte de "Quitar de Hold" (pedido explícito: llenar la
// decisión ya lo saca de espera solo).
export function resolverHold(hold, { decision, decisionNota }) {
  return {
    ...hold,
    fecha_resolucion: hoyISO(),
    decision,
    decision_nota: (decisionNota || "").trim() || null,
    activo: false,
  };
}
