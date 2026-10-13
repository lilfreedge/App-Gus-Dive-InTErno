import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import NavArrowsClientes from "./NavArrowsClientes";

// Wrapper de servidor (mismo patrón que NavArrowsServer.js de App
// Interno, para colocarlo igual en cada página). Por ahora no necesita
// resolver el perfil porque las 5 secciones de App Clientes son
// siempre visibles para cualquiera con acceso a la app -- se deja como
// componente de servidor aparte por si eso cambia más adelante.
// V30: ahora sí resuelve el perfil -- "Listado de clientes" y "Más"
// dependen de permisos, y las flechas solo deben pasar por las secciones
// que esta persona ve en el menú.
export default async function NavArrowsClientesServer() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  return <NavArrowsClientes esTitular={!!profile?.es_titular} permisos={profile?.permisos || {}} />;
}
