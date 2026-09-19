import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import ListaUsuarios from "./lista-client";
import RolesInfo from "./roles-info";
import LogoLoginSelector from "./logo-login-client";
import FormatearRegistros from "./formatear-registros-client";
import RespaldoDatos from "./respaldo-client";
import ReporteCorreoConfig from "./reporte-correo-client";
import DominioPersonalizado from "./dominio-client";

// Administración: solo el Titular puede entrar (ni siquiera los
// administradores comunes). No está en el nav de arriba, solo en el
// menú de ajustes (ver TopbarClient).
export default async function UsuariosPage() {
  const supabase = createClient();
  const { user } = await requireTitular(supabase);

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, es_titular, permisos")
    .order("full_name");

  const { data: config } = await supabase
    .from("app_config")
    .select("logo_login, dominio_personalizado, reporte_destinatarios, reporte_detalles")
    .maybeSingle();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Administración</h1>

        <div className="card">
          <ListaUsuarios perfiles={perfiles || []} miId={user.id} />
        </div>

        <RolesInfo />

        <div className="card" style={{ marginTop: 20 }}>
          <LogoLoginSelector logoActual={config?.logo_login || "grande"} />
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <Link href="/estado-sistema" className="action-card" style={{ width: "100%" }}>
            Estado del sistema
          </Link>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <DominioPersonalizado dominioActual={config?.dominio_personalizado} />
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <ReporteCorreoConfig
            destinatariosIniciales={config?.reporte_destinatarios || []}
            detallesIniciales={config?.reporte_detalles || {}}
          />
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <RespaldoDatos />
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <FormatearRegistros />
        </div>
      </div>
    </div>
  );
}
