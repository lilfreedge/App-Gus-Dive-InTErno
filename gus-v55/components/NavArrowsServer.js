import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, esOperativo } from "@/lib/roles";
import NavArrows from "./NavArrows";

// Wrapper de servidor: resuelve el perfil del usuario actual y le pasa
// esTitular/permisos al componente de cliente que dibuja las flechas.
export default async function NavArrowsServer() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  if (!profile || esOperativo(profile)) return null;

  return (
    <NavArrows
      esTitular={!!profile.es_titular}
      permisos={profile.permisos || {}}
      menuPersonalizado={profile.menu_personalizado || null}
    />
  );
}
