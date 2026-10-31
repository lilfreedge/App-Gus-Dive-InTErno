import { redirect } from "next/navigation";
import { getProfileYUser, tieneAcceso } from "./roles";

// V51 -- Agregar / editar manual: el Titular o quien tenga "manuales_editar".
// `desde` dice a qué app vuelve.
export const VOLVER_MANUALES = { interno: "/manuales", clientes: "/app-clientes/manuales", tecnico: "/tecnico/manuales" };

export async function puedeEditarManuales(supabase, desde) {
  const { user, profile } = await getProfileYUser(supabase);
  if (!user) redirect("/login");
  const volverA = VOLVER_MANUALES[desde] || VOLVER_MANUALES.interno;
  if (!tieneAcceso(profile, "manuales_editar")) redirect(volverA);
  return { profile, volverA, clientes: desde === "clientes" };
}
