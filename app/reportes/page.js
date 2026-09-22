import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerUsuariosConMovimientos } from "@/lib/reportes";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import ReportesForm from "./form-client";
import ReporteCorreoConfig from "./reporte-correo-client";

export default async function ReportesPage() {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  // Acceso normal por el permiso "reportes" -- o, aunque no tenga ese
  // permiso, si el Titular le dio "correos_semanales" (para que pueda
  // entrar solo a administrar los envíos automáticos, sin ver el resto).
  if (!user || !(tieneAcceso(profile, "reportes") || tieneAcceso(profile, "correos_semanales"))) {
    redirect("/dashboard");
  }

  const puedeCorreos = tieneAcceso(profile, "correos_semanales");

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
          <SeccionColapsable titulo="Reporte semanal por correo">
            <ReporteCorreoConfig enviosIniciales={config?.reporte_configs || []} />
          </SeccionColapsable>
        )}
      </div>
    </div>
  );
}
