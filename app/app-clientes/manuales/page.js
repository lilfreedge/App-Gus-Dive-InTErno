import { createClient } from "@/lib/supabase/server";
import { requirePermiso, tieneAcceso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import Breadcrumb from "@/components/Breadcrumb";
import ManualesLista from "@/components/ManualesLista";
import { cargarManuales } from "@/lib/manuales-server";

// V51 -- Más › Manuales de App Equipos de clientes (la misma lista que en
// App Interno).
export default async function ManualesClientesPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  const manuales = await cargarManuales(supabase);
  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <Breadcrumb items={[{ label: "Más", href: "/app-clientes/mas" }, { label: "Manuales" }]} />
        <h1 className="page-title">Manuales</h1>
        <ManualesLista manuales={manuales} puedeEditar={tieneAcceso(profile, "manuales_editar")} desde="clientes" />
      </div>
    </div>
  );
}
