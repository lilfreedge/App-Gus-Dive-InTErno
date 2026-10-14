import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import ListaUsuarios from "./lista-client";
import RolesInfo from "./roles-info";
import RolesAdmin from "@/components/RolesAdmin";
import { SECCIONES } from "./lista-client";
import FormatearRegistros from "./formatear-registros-client";
import RespaldoDatos from "./respaldo-client";
import CorreosAlmacen from "./correos-almacen-client";

// Administración: solo el Titular puede entrar (ni siquiera los
// administradores comunes). No está en el nav de arriba, solo en el
// menú de ajustes (ver TopbarClient).
export default async function UsuariosPage() {
  const supabase = createClient();
  const { user } = await requireTitular(supabase);

  // "*" (y no una lista de columnas) para que la pantalla siga abriendo
  // aunque todavía no se haya corrido migration_61.sql (rol_interno_id).
  // V31: sin las cuentas eliminadas (migration_62.sql).
  const [{ data: perfilesTodos }, { data: config }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("app_config").select("solicitudes_correos").maybeSingle(),
    supabase.from("roles_app").select("*").eq("app", "interno").order("nombre"),
  ]);
  const perfiles = (perfilesTodos || []).filter((p) => !p.eliminado_en);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Administración" }]} />

        <SeccionColapsable titulo="Usuarios y permisos">
          <ListaUsuarios perfiles={perfiles} miId={user.id} roles={roles || []} />
        </SeccionColapsable>

        {/* V31: Roles editables (migration_61.sql). */}
        <SeccionColapsable titulo="Roles">
          <RolesInfo />
          <div style={{ marginTop: 14 }}>
            <RolesAdmin app="interno" roles={roles || []} secciones={SECCIONES} perfiles={perfiles} conInicio />
          </div>
        </SeccionColapsable>

        {/* V29 -- correos del almacén para el aviso de Solicitudes al
            almacén (ver app/solicitudes y migration_52.sql). */}
        <SeccionColapsable titulo="Solicitudes al almacén">
          <CorreosAlmacen correosIniciales={config?.solicitudes_correos || []} />
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
