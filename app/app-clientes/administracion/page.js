import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import SeccionColapsable from "@/components/SeccionColapsable";
import PermisosClientes from "./permisos-client";
import FormatearRegistrosClientes from "./formatear-registros-client";

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

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, es_titular, permisos")
    .order("full_name");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Equipos de clientes", href: "/app-clientes" }, { label: "Administración" }]} />

        <div className="section-title" style={{ marginTop: 0 }}>
          Permisos
        </div>
        <PermisosClientes perfiles={perfiles || []} miId={user.id} />

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
