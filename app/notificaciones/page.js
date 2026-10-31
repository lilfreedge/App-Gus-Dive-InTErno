import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import NotificacionesPagina from "@/components/NotificacionesPagina";

// V52 -- Las notificaciones de App Interno ("Ver todas y configurar").
export default async function NotificacionesInternoPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, []);
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Breadcrumb items={[{ label: "App Interno", href: "/dashboard" }, { label: "Notificaciones" }]} />
        <h1 className="page-title">Notificaciones</h1>
        <NotificacionesPagina app="interno" puedeAdministrar={!!(profile?.es_titular || profile?.is_admin)} rutaAdmin="/admin/avisos" />
      </div>
    </div>
  );
}
