import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import Breadcrumb from "@/components/Breadcrumb";
import AccesosClient from "./accesos-client";

// "Accesos a apps" (26-sep-2026, pedido explícito: "quites el check que
// esta dentro de administracion del app equipos cliente, que es para ver
// este app y lo pongas en esta ventana donde estan los apps, para yo
// darle acceso a los usuarios a los apps. Hace falta también un check de
// app interno") -- reemplaza el check "Equipos de clientes" que antes
// vivía en Administración de App Equipos de clientes, y agrega uno
// nuevo, paralelo, para App Interno (profiles.permisos.acceso_app_interno,
// ver migration_28.sql). Solo el Titular entra aquí -- se llega desde el
// ícono de ajustes de /espacio, no desde dentro de ninguna de las dos
// apps, porque es el único lugar donde tiene sentido decidir quién entra
// a CUÁL app.
export default async function AccesosAppsPage() {
  const supabase = createClient();
  const { user } = await requireTitular(supabase);

  const { data: perfiles } = await supabase
    .from("profiles")
    .select("id, full_name, es_titular, permisos")
    .order("full_name");

  // Resumen de conteos (item 9, pedido explícito, 26-sep-2026) -- cuántos
  // usuarios tienen acceso marcado a cada app, del total. El Titular no
  // entra en el conteo -- siempre tiene acceso a las dos sin necesitar
  // este check (ver AccesosClient, fila con "—").
  const noTitulares = (perfiles || []).filter((p) => !p.es_titular);
  const totalUsuarios = noTitulares.length;
  const conAccesoClientes = noTitulares.filter((p) => !!p.permisos?.equipos_clientes).length;
  const conAccesoInterno = noTitulares.filter((p) => !!p.permisos?.acceso_app_interno).length;

  // Mismo badge de "Usuarios nuevos" que /espacio (item 10, 1-oct-2026) --
  // para que el Titular lo vea sin importar en cuál de las dos pantallas
  // de ajustes esté.
  const { count: pendientesAprobacion } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("aprobado", false);

  return (
    <div>
      <HeaderSimple nombre="" etiqueta="Accesos a apps" esTitular pendientesAprobacion={pendientesAprobacion || 0} />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Selecciona tu espacio", href: "/espacio" }, { label: "Accesos a apps" }]} />
        <h1 className="page-title">Accesos a apps</h1>
        <p className="page-subtitle">
          Quién puede entrar a cada app. Quien no tenga el acceso marcado ya no ve el botón de esa app en &quot;Selecciona tu espacio&quot;.
        </p>

        {totalUsuarios > 0 && (
          <div className="stat-row">
            <div className="stat-card">
              <div className="stat-value">{conAccesoClientes} de {totalUsuarios}</div>
              <div className="stat-label">Con acceso a Equipos de clientes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{conAccesoInterno} de {totalUsuarios}</div>
              <div className="stat-label">Con acceso a App Interno</div>
            </div>
          </div>
        )}

        <AccesosClient perfiles={perfiles || []} miId={user.id} />
      </div>
    </div>
  );
}
