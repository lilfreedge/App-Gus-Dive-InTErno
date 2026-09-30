// Helpers compartidos de equipos_del_cliente.
//
// Seriales repetidos prohibidos (feedback en vivo, 29-sep-2026, pedido
// explícito: "prohibir rotundamente la posibilidad de registrar seriales
// repetidos, ya sean de tanques reguladores o lo que sea") -- un No. de
// serie lo asigna el fabricante, así que dos equipos distintos con el
// mismo serial es casi siempre un error de captura (o el mismo equipo
// cargado dos veces sin querer). Se valida GLOBAL, no solo dentro de un
// mismo cliente (criterio de Claude, no especificado explícitamente --
// avisado en el resumen de esta entrega por si se prefiere acotarlo por
// cliente en vez de global).
export async function serieYaRegistrada(supabase, serie, { excluirId } = {}) {
  const limpia = (serie || "").trim();
  if (!limpia) return null;
  let query = supabase.from("equipos_del_cliente").select("id, cliente_id, tipo_equipo").ilike("serie", limpia).limit(1);
  if (excluirId) query = query.neq("id", excluirId);
  const { data } = await query;
  return data && data.length > 0 ? data[0] : null;
}

export const MENSAJE_SERIE_DUPLICADA = "Ya existe un equipo registrado con ese número de serie. Revisa que no sea el mismo equipo ya cargado antes.";
