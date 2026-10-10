import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import { obtenerUsuariosConMovimientos } from "@/lib/reportes";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import ReportesForm from "./form-client";
import ReporteCorreoConfig from "./reporte-correo-client";

export default async function ReportesPage() {
  const supabase = createClient();
  // Acceso normal por el permiso "reportes" -- o, aunque no tenga ese
  // permiso, si el Titular le dio "correos_semanales" (para que pueda
  // entrar solo a administrar los envíos automáticos, sin ver el resto).
  // V30: además exige el acceso a App Interno (requireInterno).
  const { user, profile } = await requireInterno(supabase, ["reportes", "correos_semanales"]);

  const puedeCorreos = tieneAcceso(profile, "correos_semanales");
  const esTitular = !!profile?.es_titular;

  const [usuarios, config] = await Promise.all([
    obtenerUsuariosConMovimientos(supabase),
    puedeCorreos
      ? supabase
          .from("app_config")
          .select("reporte_configs")
          .maybeSingle()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Reportes" }]} />

        <ReportesForm usuarios={usuarios} />

        {puedeCorreos && (
          <ReporteCorreoConfig enviosIniciales={config?.reporte_configs || []} esTitular={esTitular} />
        )}
      </div>
    </div>
  );
}
