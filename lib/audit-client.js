// Guarda una copia del registro en cambios_historial antes de editarlo o borrarlo.
// Se llama desde el navegador (cliente), por eso recibe el supabase client ya creado.
export async function registrarCambio(supabase, { tabla, registroId, accion, datosAnteriores }) {
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
  });
}
