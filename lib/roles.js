import { redirect } from "next/navigation";

const PERMISOS_DEFAULT = {
  reportes: false,
  catalogo: true,
  historial: false,
  changelog: false,
};

// Trae el perfil (nombre, si es administrador, si es Titular y sus
// permisos) del usuario logueado.
export async function getProfileYUser(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, es_titular, permisos")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile: profile
      ? { ...profile, permisos: { ...PERMISOS_DEFAULT, ...(profile.permisos || {}) } }
      : null,
  };
}

// El Titular siempre tiene acceso total a todo, sin importar `permisos`.
export function tieneAcceso(profile, seccion) {
  if (!profile) return false;
  if (profile.es_titular) return true;
  return !!profile.permisos?.[seccion];
}

// Para usar al inicio de páginas/acciones que son solo de administrador.
// Si no es admin (ni Titular), lo manda de vuelta al dashboard.
export async function requireAdmin(supabase) {
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !(profile?.is_admin || profile?.es_titular)) {
    redirect("/dashboard");
  }

  return { user, profile };
}

// Para páginas que son solo del Titular (p. ej. Administración).
export async function requireTitular(supabase) {
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !profile?.es_titular) {
    redirect("/dashboard");
  }

  return { user, profile };
}

// Para páginas visibles según profiles.permisos (p. ej. Historial),
// donde el Titular siempre tiene acceso sin importar el valor guardado.
export async function requirePermiso(supabase, seccion) {
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, seccion)) {
    redirect("/dashboard");
  }

  return { user, profile };
}
