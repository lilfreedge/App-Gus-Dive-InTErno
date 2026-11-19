import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import CorreosAlmacen from "@/app/admin/usuarios/correos-almacen-client";
import ReporteCorreoConfig from "@/app/reportes/reporte-correo-client";

export const dynamic = "force-dynamic";

// V89 (maqueta V90, aprobada 16-nov-2026: "agrégalo también en alquiler y
// demás"): Correos automáticos, también desde Más de cada app. Es la misma
// configuración que Administración › Correos automáticos; solo el Titular entra.
export default async function CorreosAutomaticosPage() {
  const supabase = createClient();
  await requireTitular(supabase);
  const { data: config } = await supabase.from("app_config").select("solicitudes_correos, nuevas_cuentas_correos, reporte_configs").maybeSingle();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Correos automáticos" }]} />

        <SeccionColapsable titulo="Reportes automáticos">
          <ReporteCorreoConfig enviosIniciales={config?.reporte_configs || []} esTitular enAdministracion />
        </SeccionColapsable>

        {/* V110 ("cada app debe tener su sección de correos automáticos por
            separado"): el presupuesto de cursos pasó a Control Estudiantes ›
            Más › Correos automáticos. */}
        <SeccionColapsable titulo="Aviso de solicitudes al almacén">
          <CorreosAlmacen correosIniciales={config?.solicitudes_correos || []} />
        </SeccionColapsable>

        <SeccionColapsable titulo="Aviso de cuentas nuevas">
          <CorreosAlmacen
            correosIniciales={config?.nuevas_cuentas_correos || []}
            campo="nuevas_cuentas_correos"
            nota="A estos correos les llega el aviso cada vez que alguien crea una cuenta, para que la apruebes en Usuarios nuevos."
          />
        </SeccionColapsable>
      </div>
    </div>
  );
}
