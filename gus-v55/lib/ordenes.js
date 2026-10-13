// Helpers compartidos de ordenes_equipos.
//
// No. de orden repetido, prohibido (feedback en vivo, 1-oct-2026, pedido
// explícito: "No permita que numeros sean repetidos en Numeros de orden,
// esto debe de ser un numero unico") -- mismo criterio/patrón que
// serieYaRegistrada en lib/equipos.js: validación en la app antes de
// guardar, más un índice único a nivel de base de datos como respaldo
// (migration_47.sql). Comparación case-insensitive, sobre el texto tal
// cual se escribió -- "0001" y "1" se tratan como valores DISTINTOS (no
// se intenta igualar números con distinto formato de ceros a la
// izquierda), ya que lo pedido fue que no se repita lo que se escribe.
export async function noOrdenYaRegistrado(supabase, noOrden, { excluirId } = {}) {
  const limpio = (noOrden || "").trim();
  if (!limpio) return null;
  let query = supabase.from("ordenes_equipos").select("id, no_orden_fisico, folio").ilike("no_orden_fisico", limpio).limit(1);
  if (excluirId) query = query.neq("id", excluirId);
  const { data } = await query;
  return data && data.length > 0 ? data[0] : null;
}

export const MENSAJE_NO_ORDEN_DUPLICADO = "Ya existe una orden registrada con ese No. de orden. Revisa que no sea la misma orden, o corrige el número.";
