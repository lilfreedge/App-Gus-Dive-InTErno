// ¿Una edición cambió algo de verdad? (feedback sobre v52, 6-oct-2026,
// pedido explícito, con captura de una "Orden editada" con Antes y Después
// idénticos: "corrige que el app no tome en cuenta ediciones sin
// modificaciones. Hoy en dia veo mucha ediciones que estan intactas...
// eso no deberia de ser tomado en cuenta como edición").
//
// Se usa en dos lados:
// - lib/audit-client.js (registrarCambio): si el "después" es igual al
//   "antes", ya ni se guarda en cambios_historial.
// - Historial / Bitácora de la orden / Bitácora movimientos: oculta las
//   ediciones vacías que ya se guardaron antes de este arreglo (no se
//   borran de la base de datos, solo dejan de mostrarse y de contarse).
//
// Se ignoran las marcas de tiempo que cambian en cada guardado aunque no
// cambie nada más (updated_at, created_at, y el actualizado_en interno
// del Informe de mantenimiento). Vacíos equivalentes (null, undefined, "",
// [], {}, false) cuentan como lo mismo. El orden de las llaves de un jsonb
// no importa (se ordenan antes de comparar).
const IGNORAR = new Set(["updated_at", "created_at", "actualizado_en"]);

export function normalizarValor(v) {
  if (v === undefined || v === null || v === false) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  if (Array.isArray(v)) {
    const arr = v.map(normalizarValor);
    return arr.length === 0 ? null : arr;
  }
  if (typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) {
      if (IGNORAR.has(k)) continue;
      const n = normalizarValor(v[k]);
      if (n !== null) out[k] = n;
    }
    return Object.keys(out).length === 0 ? null : out;
  }
  return v;
}

export function mismoValor(a, b) {
  return JSON.stringify(normalizarValor(a)) === JSON.stringify(normalizarValor(b));
}

// `despues` puede traer solo las llaves que se editaron (ej. "Editar datos
// de la orden") o el registro completo (ej. el wizard de Seguimiento) --
// en los dos casos se compara solo lo que trae `despues`. Ediciones viejas
// sin "después" guardado (antes de migration_29.sql) no se pueden juzgar:
// se siguen mostrando como siempre.
export function hayCambioReal(antes, despues) {
  if (!despues) return true;
  const a = antes || {};
  for (const k of Object.keys(despues)) {
    if (IGNORAR.has(k)) continue;
    if (!mismoValor(a[k], despues[k])) return true;
  }
  return false;
}

// Para filtrar listas de cambios_historial: las anulaciones ("borrar")
// siempre cuentan; las ediciones, solo si cambiaron algo.
export function esCambioVisible(cambio) {
  if (cambio?.accion !== "editar") return true;
  return hayCambioReal(cambio.datos_anteriores, cambio.datos_nuevos);
}
