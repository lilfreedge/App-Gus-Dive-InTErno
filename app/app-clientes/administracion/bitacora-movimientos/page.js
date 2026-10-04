import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BitacoraMovimientosClient from "./bitacora-movimientos-client";

// "Bitácora movimientos en órdenes" (27-sep-2026, pedido explícito: "un
// boton en 'mas'... un registro de todas las veces que cualquier orden es
// editada. para enterarme quien cambio que en cada orden") -- botón
// propio en "Más", distinto de "Historial" (que mezcla ediciones Y
// movimientos anulados de órdenes Y equipos). Este solo trae ediciones de
// ordenes_equipos, sin filtrar por una orden en particular -- para ver de
// un vistazo quién cambió qué en cualquier orden. Misma fuente
// (historial_con_nombre), reutilizando filasOrden (lib/historial-ordenes.js)
// para no desincronizar la lista de campos entre las dos pantallas.
// Arrancó Titular-only como "Historial", pero el mismo día (pedido
// explícito: "pon para yo dar acceso... en administracion") pasó a
// gatearse con un permiso granular propio (equipos_clientes_bitacora_
// movimientos) -- el Titular sigue viendo esto siempre, sin importar el
// valor guardado (ver tieneAcceso en lib/roles.js).
export default async function BitacoraMovimientosPage() {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_bitacora_movimientos");

  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "ordenes_equipos")
    .eq("accion", "editar")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Bitácora movimientos en órdenes" },
          ]}
        />
        <h1 className="page-title">Bitácora movimientos en órdenes</h1>
        <p className="page-subtitle">Quién editó qué, agrupado por orden -- las más recientes primero.</p>

        {/* Agrupado por orden + buscador por No. de orden (1-oct-2026,
            pedido explícito: "que dentro de 'bitacora movimientos en
            ordenes' haya una barra de search para buscar no. de orden. Y
            que cada orden sea un boton y dentro aparezcan todos sus
            movimientos. Y pon los botones mas pequenos, se ven muy
            voluminosos") -- antes cada edición individual se mostraba como
            su propia tarjeta grande, sin agrupar; ver
            bitacora-movimientos-client.js. "Borrar toda la bitácora"
            (28-sep-2026, pedido explícito) se mantiene igual, solo
            Titular. */}
        <BitacoraMovimientosClient cambios={cambios || []} esTitular={!!profile?.es_titular} />
      </div>
    </div>
  );
}
