import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, esOperativo } from "@/lib/roles";
import { seccionesVisibles } from "@/lib/nav";
import NavArrows from "./NavArrows";

// Wrapper de servidor: resuelve el perfil del usuario actual y le pasa
// esTitular/permisos al componente de cliente que dibuja las flechas.
export default async function NavArrowsServer() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  if (!profile) return null;
  // Operativo: sin flechas, salvo que su rol le dé secciones extra (V31).
  if (esOperativo(profile) && seccionesVisibles({ esTitular: false, permisos: profile.permisos }).length <= 1) return null;

  return (
    <NavArrows
      esTitular={!!profile.es_titular}
      permisos={profile.permisos || {}}
      menuPersonalizado={profile.menu_personalizado || null}
    />
  );
}
