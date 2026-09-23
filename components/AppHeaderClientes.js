import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import TopbarClientes from "./TopbarClientes";

// Mismo split que AppHeader/TopbarClient (App Interno): esta parte trae
// el perfil en el servidor, TopbarClientes (cliente) dibuja el topbar.
// Ahora también trae permisos (para el link de Changelog) y
// orden_menu_clientes (para el drag & drop del menú, columna aparte de
// la de App Interno).
export default async function AppHeaderClientes() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  if (!user) return null;

  const nombreCompleto = profile?.full_name || user.email;
  const nombre = nombreCompleto.split(" ")[0];

  return (
    <TopbarClientes
      nombre={nombre}
      nombreCompleto={nombreCompleto}
      correo={user.email}
      esTitular={!!profile?.es_titular}
      permisos={profile?.permisos || {}}
      ordenMenuClientes={profile?.orden_menu_clientes}
      menuPersonalizadoClientes={profile?.menu_personalizado_clientes}
    />
  );
}
