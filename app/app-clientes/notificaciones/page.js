import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NotificacionesPagina from "@/components/NotificacionesPagina";

// V52 -- Las notificaciones de App Equipos de clientes ("Ver todas y configurar").
export default async function NotificacionesClientesPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Breadcrumb items={[{ label: "App Equipos de clientes", href: "/app-clientes" }, { label: "Notificaciones" }]} />
        <h1 className="page-title">Notificaciones</h1>
        <NotificacionesPagina app="clientes" puedeAdministrar={!!(profile?.es_titular || profile?.is_admin)} rutaAdmin="/app-clientes/administracion/avisos" />
      </div>
    </div>
  );
}
