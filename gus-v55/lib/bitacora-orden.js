import { esCambioVisible } from "./cambios";

// Ediciones de UNA orden que van en su Bitácora (feedback sobre v52,
// 6-oct-2026, pedido explícito: "la cantidad que aparece en () aparece en
// 0... corrige eso"). Compartido entre la pantalla de Bitácora de la
// orden y el contador de "Ver bitácora de la orden (N)" en la ficha, para
// que los dos cuenten exactamente lo mismo -- antes la ficha solo contaba
// las entradas de bitacora_orden (Holds resueltos, repuestos autorizados
// eliminados) y no las ediciones, que la pantalla sí muestra desde v49.
// Las ediciones sin ningún cambio real no cuentan (lib/cambios.js).
export async function edicionesDeLaOrden(supabase, ordenId, columnas = "*") {
  const { data } = await supabase
    .from("historial_con_nombre")
    .select(columnas)
    .eq("tabla", "ordenes_equipos")
    .eq("accion", "editar")
    .eq("registro_id", ordenId)
    .order("created_at", { ascending: false });
  return (data || []).filter(esCambioVisible);
}
