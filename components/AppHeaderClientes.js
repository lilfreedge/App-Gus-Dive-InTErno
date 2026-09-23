import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import TopbarClientes from "./TopbarClientes";

// Mismo split que AppHeader/TopbarClient (App Interno): esta parte trae
// el perfil en el servidor, TopbarClientes (cliente) dibuja el topbar.
// App Equipos Clientes (23-sep-2026, primera versión real) tiene su
// propio topbar más simple -- sin drag&drop ni accesos personalizados,
// solo 4 pestañas fijas.
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
    />
  );
}
