import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import { obtenerUsuariosConMovimientos } from "@/lib/reportes";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import ReportesForm from "./form-client";

export default async function ReportesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "reportes");

  const usuarios = await obtenerUsuariosConMovimientos(supabase);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Reportes" }]} />

        <ReportesForm usuarios={usuarios} />
      </div>
    </div>
  );
}
