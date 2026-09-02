import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import { obtenerUsuariosConMovimientos } from "@/lib/reportes";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
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
        <h1 className="page-title">Reportes</h1>

        <ReportesForm usuarios={usuarios} />
      </div>
    </div>
  );
}
