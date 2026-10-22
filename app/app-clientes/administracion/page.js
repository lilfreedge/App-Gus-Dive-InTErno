import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import PermisosClientes, { SECCIONES } from "./permisos-client";
import RolesAdmin from "@/components/RolesAdmin";
import { INICIO_CLIENTES } from "@/lib/roles-inicio";
import FormatearRegistrosClientes from "./formatear-registros-client";
import ProcesosOrdenesClientes from "./procesos-ordenes-client";
import ConInfo from "@/components/ConInfo";

// Administración de App Clientes (23-sep-2026, pedido explícito del
// usuario: "creame sen settings una seccion similar a la de app interno
// para yo dar permisos de cosas de este app"). Solo el Titular entra
// aquí -- ni siquiera los administradores de App Interno, mismo criterio
// que "Administración" allá. Por ahora solo existe un permiso propio de
// esta app (Equipos de clientes), así que la tabla es chica; si se
// agregan más secciones a App Clientes esta página crece con ellas.
// El nombre de esta sección es provisional -- el usuario dijo "no se
// como le llamaremos".
export default async function AdministracionClientesPage() {
  const supabase = createClient();
  const { user } = await requireTitular(supabase);

  // "*" para que abra aunque falte migration_61.sql; sin cuentas eliminadas.
  const [{ data: perfilesTodos }, { data: roles }, { data: rolesInterno }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("roles_app").select("*").eq("app", "clientes").order("nombre"),
    // V34: los roles de la otra app, para "Vinculado con".
    supabase.from("roles_app").select("id, nombre").eq("app", "interno").order("nombre"),
  ]);
  const perfiles = (perfilesTodos || []).filter((p) => !p.eliminado_en);

  // "Procesos órdenes" (28-sep-2026, pedido explícito) -- fila única de
  // ajustes_app_clientes (migration_40.sql), sembrada por la propia
  // migración. Si por algún motivo todavía no existe (migración sin
  // correr), ProcesosOrdenesClientes/requiereVerificacion tratan la
  // ausencia igual que si estuviera vacía -- todo sigue requiriendo
  // verificación, el comportamiento de siempre.
  const { data: ajustes } = await supabase.from("ajustes_app_clientes").select("*").eq("id", true).maybeSingle();

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Equipos de clientes", href: "/app-clientes" }, { label: "Administración" }]} />

        {/* V32: el texto "Toca a una persona..." pasa al botón ⓘ. */}
        <ConInfo
          style={{ marginBottom: 12 }}
          texto="Toca a una persona para ver y cambiar su rol y sus permisos en esta app. Los cambios se guardan al momento."
        >
          <div className="section-title" style={{ margin: 0 }}>
            Permisos
          </div>
        </ConInfo>
        <PermisosClientes perfiles={perfiles} miId={user.id} roles={roles || []} />

        {/* V31: Roles de esta app (migration_61.sql). */}
        <SeccionColapsable titulo="Roles">
          <RolesAdmin app="clientes" roles={roles || []} secciones={SECCIONES} perfiles={perfiles} opcionesInicio={INICIO_CLIENTES} rolesOtraApp={rolesInterno || []} />
        </SeccionColapsable>

        <div className="section-title">Procesos órdenes</div>
        <ProcesosOrdenesClientes ajustes={ajustes} />

        {/* El Historial se movió a un solo botón dentro de "Más" (item 31,
            pedido explícito, 27-sep-2026: "en mas, crea un boton de
            historial y ahi dentro pone los historiales que te dije
            anteriormente. tambien pon movimientos anulados") -- antes
            vivía acá como dos botones sueltos. */}

        <SeccionColapsable titulo="Zona de peligro" danger>
          <FormatearRegistrosClientes />
        </SeccionColapsable>
      </div>
    </div>
  );
}
