import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import ListaUsuarios from "./lista-client";
import RolesInfo from "./roles-info";
import LogoLoginSelector from "./logo-login-client";
import FormatearRegistros from "./formatear-registros-client";
import RespaldoDatos from "./respaldo-client";
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
    .select("logo_login, dominio_personalizado")
    .maybeSingle();

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Administración" }]} />

        <SeccionColapsable titulo="Usuarios y permisos">
          <ListaUsuarios perfiles={perfiles || []} miId={user.id} />
        </SeccionColapsable>

        <SeccionColapsable titulo="Roles">
          <RolesInfo />
        </SeccionColapsable>

        <SeccionColapsable titulo="Logo de inicio de sesión">
          <LogoLoginSelector logoActual={config?.logo_login || "grande"} />
        </SeccionColapsable>

        <div style={{ marginTop: 14 }}>
          <Link
            href="/estado-sistema"
            className="btn secondary"
            style={{ width: "100%", display: "flex", justifyContent: "center", textDecoration: "none" }}
          >
            Estado del sistema
          </Link>
        </div>

        <SeccionColapsable titulo="Dominio personalizado">
          <DominioPersonalizado dominioActual={config?.dominio_personalizado} />
        </SeccionColapsable>

        <SeccionColapsable titulo="Respaldo de datos">
          <RespaldoDatos />
        </SeccionColapsable>

        <SeccionColapsable titulo="Zona de peligro" danger>
          <FormatearRegistros />
        </SeccionColapsable>
      </div>
    </div>
  );
}
