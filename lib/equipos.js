import { tipoEquipoLabel } from "./tipo-equipo";

// Helpers compartidos de equipos_del_cliente.
//
// Seriales repetidos prohibidos (feedback en vivo, 29-sep-2026, pedido
// explícito: "prohibir rotundamente la posibilidad de registrar seriales
// repetidos, ya sean de tanques reguladores o lo que sea") -- un No. de
// serie lo asigna el fabricante, así que dos equipos distintos con el
// mismo serial es casi siempre un error de captura (o el mismo equipo
// cargado dos veces sin querer). Se valida GLOBAL, no solo dentro de un
// mismo cliente (criterio de Claude, aprobado por el usuario el
// 30-sep-2026, feedback en vivo, "8. ok").
export async function serieYaRegistrada(supabase, serie, { excluirId } = {}) {
  const limpia = (serie || "").trim();
  if (!limpia) return null;
  let query = supabase
    .from("equipos_del_cliente")
    .select("id, cliente_id, tipo_equipo, tipo_equipo_otro")
    .ilike("serie", limpia)
    .limit(1);
  if (excluirId) query = query.neq("id", excluirId);
  const { data } = await query;
  return data && data.length > 0 ? data[0] : null;
}

export const MENSAJE_SERIE_DUPLICADA = "Ya existe un equipo registrado con ese número de serie. Revisa que no sea el mismo equipo ya cargado antes.";

// Mensaje con el detalle de cliente + equipo del duplicado (feedback en
// vivo, 30-sep-2026, pedido explícito: "cuando de el aviso de que ya
// existe ese serial, que de el detalle de el cliente y el equipo que
// tiene esa seria") -- recibe el registro que ya devuelve
// serieYaRegistrada() y hace una consulta chica aparte a
// clientes_equipos para el nombre (mismo criterio que ya usa el resto de
// la app -- ver item 16/17 de v45 -- en vez de un embed de Supabase).
// Si por lo que sea no se puede resolver el cliente (borrado, RLS, etc.),
// cae de vuelta al mensaje genérico en vez de fallar.
export async function mensajeSerieDuplicada(supabase, existente) {
  if (!existente) return MENSAJE_SERIE_DUPLICADA;
  const tipo = tipoEquipoLabel(existente.tipo_equipo, existente.tipo_equipo_otro) || "equipo";
  let clienteTexto = "";
  if (existente.cliente_id) {
    const { data: cliente } = await supabase
      .from("clientes_equipos")
      .select("nombre")
      .eq("id", existente.cliente_id)
      .maybeSingle();
    if (cliente?.nombre) clienteTexto = ` de ${cliente.nombre}`;
  }
  return `Ya existe un ${tipo}${clienteTexto} registrado con ese número de serie. Revisa que no sea el mismo equipo ya cargado antes.`;
}
