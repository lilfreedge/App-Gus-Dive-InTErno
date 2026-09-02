import { redirect } from "next/navigation";

// Trae el perfil (nombre + si es administrador) del usuario logueado.
export async function getProfileYUser(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

// Para usar al inicio de páginas/acciones que son solo de administrador.
// Si no es admin, lo manda de vuelta al dashboard.
export async function requireAdmin(supabase) {
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !profile?.is_admin) {
    redirect("/dashboard");
  }

  return { user, profile };
}
