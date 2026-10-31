import { createClient } from "@/lib/supabase/server";
import { requireInterno, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import ManualesLista from "@/components/ManualesLista";
import { cargarManuales } from "@/lib/manuales-server";

// V51 -- Más › Manuales de App Interno (la misma lista que en App Equipos de
// clientes). Todos la ven; agregar y quitar, el Titular o quien tenga el
// permiso "Manuales" ("19. solo yo por ahora pero pon para poder dar acceso").
export default async function ManualesInternoPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase);
  const manuales = await cargarManuales(supabase);
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Manuales" }]} />
        <h1 className="page-title">Manuales</h1>
        <ManualesLista manuales={manuales} puedeEditar={tieneAcceso(profile, "manuales_editar")} desde="interno" />
      </div>
    </div>
  );
}
