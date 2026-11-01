import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { permisosEst } from "@/lib/estudiantes/modelo";
import EstudiantesApp from "@/components/estudiantes/EstudiantesApp";

export const dynamic = "force-dynamic";

// Control Estudiantes (migration_78.sql). Todas las pantallas de
// /control-estudiantes/... las dibuja EstudiantesApp; aquí solo se revisa el
// acceso y se arman los permisos de quien entra.
export default async function EstudiantesLayout() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!profile) redirect("/login");
  if (!tieneAcceso(profile, "acceso_estudiantes")) redirect("/espacio?elegir=1");

  const nombre = profile.full_name || "";
  const yo = {
    id: user.id,
    nombre,
    corto: nombre.trim().split(/\s+/)[0] || "Yo",
    correo: user.email || "",
    esTitular: !!profile.es_titular,
    verChangelog: tieneAcceso(profile, "changelog"),
  };
  return <EstudiantesApp p={permisosEst(profile)} yo={yo} />;
}
