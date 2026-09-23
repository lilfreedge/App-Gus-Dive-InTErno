import { redirect } from "next/navigation";

const PERMISOS_DEFAULT = {
  reportes: false,
  catalogo: true,
  historial: false,
  changelog: false,
  manual: false,
  movimientos: false,
  facturacion: false,
  registrar_inspeccion: false,
  registrar_llenado: false,
  registrar_mantenimiento: false,
  catalogo_codigo: false,
  catalogo_regulador: false,
  catalogo_tanque: false,
  compresores: false,
  correos_semanales: false,
  equipos_clientes: false,
  // Permisos granulares de App Clientes (23-sep-2026, pedido explícito):
  // equipos_clientes ya gatea poder ENTRAR a la app -- estos 4 son más
  // finos, para acciones puntuales dentro de ella. Sin un permiso dado,
  // el usuario igual puede VER todo, solo no puede hacer esa acción
  // (botones ocultos/deshabilitados).
  equipos_clientes_registrar: false,
  equipos_clientes_agregar_equipo: false,
  equipos_clientes_agregar_cliente: false,
  equipos_clientes_catalogo: false,
};

const MENU_PERSONALIZADO_DEFAULT = {
  llenados: true,
  inspeccion_visual: false,
  mantenimiento_reguladores: false,
  compresores: false,
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
    .select("id, full_name, is_admin, es_titular, permisos, menu_personalizado, orden_menu, orden_menu_clientes")
    .eq("id", user.id)
    .single();

  return {
    user,
    profile: profile
      ? {
          ...profile,
          permisos: { ...PERMISOS_DEFAULT, ...(profile.permisos || {}) },
          menu_personalizado: {
            ...MENU_PERSONALIZADO_DEFAULT,
            ...(profile.menu_personalizado || {}),
          },
        }
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

// Para páginas de App Clientes gateadas por uno de los permisos
// granulares nuevos (item 15, 23-sep-2026: registrar orden, agregar
// equipo, agregar cliente, acceso a Base de datos). A diferencia de
// requirePermiso, si falta el permiso puntual no manda a /dashboard
// (eso es de App Interno, sacaría de la app a alguien que sí tiene
// acceso a ella) sino de vuelta a una página de App Clientes -- sin el
// permiso, el usuario igual puede VER todo, solo no puede hacer esa
// acción en concreto.
export async function requirePermisoClientes(supabase, seccion, redirectTo = "/app-clientes") {
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "equipos_clientes")) {
    redirect("/dashboard");
  }
  if (!tieneAcceso(profile, seccion)) {
    redirect(redirectTo);
  }

  return { user, profile };
}
