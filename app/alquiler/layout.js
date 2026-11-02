import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AlquilerApp from "@/components/alquiler/AlquilerApp";

export const dynamic = "force-dynamic";

// App Alquiler (migration_82.sql). Todas las pantallas de /alquiler/... las
// dibuja AlquilerApp; aquí solo se revisa el acceso (Accesos a apps).
export default async function AlquilerLayout() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!profile) redirect("/login");
  if (!tieneAcceso(profile, "acceso_alquiler")) redirect("/espacio?elegir=1");

  const nombre = profile.full_name || "";
  const yo = {
    id: user.id,
    nombre,
    corto: nombre.trim().split(/\s+/)[0] || "Yo",
    correo: user.email || "",
    esTitular: !!profile.es_titular,
    verChangelog: tieneAcceso(profile, "changelog"),
  };
  // Precios y equipos: el Titular, los administradores o quien tenga
  // "alq_equipos" (lo mismo que revisa la base, alq_puede('alq_equipos')).
  const p = { equipos: !!(profile.es_titular || profile.is_admin || profile.permisos?.alq_equipos) };
  return <AlquilerApp p={p} yo={yo} />;
}
