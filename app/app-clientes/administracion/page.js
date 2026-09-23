import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import PermisosClientes from "./permisos-client";

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
        <Breadcrumb items={[{ label: "App Clientes", href: "/app-clientes" }, { label: "Administración" }]} />

        <div className="section-title" style={{ marginTop: 0 }}>
          Permisos
        </div>
        <PermisosClientes perfiles={perfiles || []} miId={user.id} />

        <div style={{ marginTop: 20 }}>
          <Link
            href="/app-clientes/administracion/historial"
            className="btn secondary"
            style={{ width: "100%", display: "flex", justifyContent: "center", textDecoration: "none" }}
          >
            Historial de ediciones
          </Link>
        </div>
      </div>
    </div>
  );
}
