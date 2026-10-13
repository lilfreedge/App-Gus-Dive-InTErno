import { hayCambioReal } from "./cambios";

// Guarda una copia del registro en cambios_historial antes de editarlo o borrarlo.
// Se llama desde el navegador (cliente), por eso recibe el supabase client ya creado.
//
// `datosNuevos` (item 20, pedido explícito, 26-sep-2026: "que en las
// ediciones aparezca el before and after" -- antes solo se guardaba el
// "antes"): opcional, los valores que se están a punto de guardar con el
// mismo `update` que sigue a este registrarCambio. Se guarda tal cual,
// sin adivinar nada -- si no se pasa (la mayoría de los usos existentes en
// el resto de la app), la columna queda en null y esos historiales
// siguen mostrando solo el "antes", como siempre.
export async function registrarCambio(supabase, { tabla, registroId, accion, datosAnteriores, datosNuevos, motivo }) {
  // Ediciones sin ningún cambio real ya no se guardan (feedback sobre v52,
  // pedido explícito: "que el app no tome en cuenta ediciones sin
  // modificaciones") -- ver lib/cambios.js. Solo se puede saber cuando se
  // pasa `datosNuevos`; sin él (la mayoría de App Interno) se guarda como
  // siempre.
  if (accion === "editar" && datosNuevos && !hayCambioReal(datosAnteriores, datosNuevos)) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase.from("cambios_historial").insert({
    user_id: user.id,
    tabla,
    registro_id: registroId,
    accion,
    datos_anteriores: datosAnteriores,
    datos_nuevos: datosNuevos ?? null,
    motivo: motivo ?? null,
  });
}
