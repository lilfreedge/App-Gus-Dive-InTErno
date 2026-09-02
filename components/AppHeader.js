import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import TopbarClient from "./TopbarClient";

export default async function AppHeader() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  if (!user) return null;

  const nombreCompleto = profile?.full_name || user.email;
  const nombre = nombreCompleto.split(" ")[0];

  return (
    <TopbarClient
      nombre={nombre}
      nombreCompleto={nombreCompleto}
      correo={user.email}
      isAdmin={!!profile?.is_admin}
      esTitular={!!profile?.es_titular}
      permisos={profile?.permisos || {}}
    />
  );
}
