import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BitacoraMovimientosClient from "./bitacora-movimientos-client";
import { esCambioVisible } from "@/lib/cambios";
import ConInfo from "@/components/ConInfo";

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
// V32: ?usuario=<id> muestra solo los movimientos de esa persona -- es el
// enlace "Ver sus movimientos en órdenes" de su ficha (Administración ›
// Permisos › tocar el nombre).
export default async function BitacoraMovimientosPage({ searchParams }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(supabase, "equipos_clientes_bitacora_movimientos");
  const usuarioId = typeof searchParams?.usuario === "string" ? searchParams.usuario : null;

  let consulta = supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "ordenes_equipos")
    .eq("accion", "editar")
    .order("created_at", { ascending: false })
    .limit(300);
  if (usuarioId) consulta = consulta.eq("user_id", usuarioId);
  const { data: cambios } = await consulta;

  let nombreUsuario = null;
  if (usuarioId) {
    const { data: p } = await supabase.from("profiles").select("full_name").eq("id", usuarioId).maybeSingle();
    nombreUsuario = p?.full_name || "esta persona";
  }

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
            { label: "Bitácora de órdenes" },
          ]}
        />
        {/* V32: el subtítulo pasa al botón ⓘ junto al título. */}
        <ConInfo style={{ marginBottom: 12 }} texto="Quién editó qué, agrupado por orden -- las más recientes primero.">
          <h1 className="page-title" style={{ margin: 0 }}>
            Bitácora de órdenes
          </h1>
        </ConInfo>
        {nombreUsuario && (
          <div className="aviso-box" style={{ marginTop: 0, marginBottom: 12 }}>
            Solo los movimientos de <b>{nombreUsuario}</b>.{" "}
            <Link href="/app-clientes/administracion/bitacora-movimientos" style={{ fontWeight: 700, color: "inherit" }}>
              Ver todos
            </Link>
          </div>
        )}

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
        {/* Ediciones sin ningún cambio real, ocultas (feedback sobre v52, ver
            lib/cambios.js) -- no se borran de la base de datos. */}
        <BitacoraMovimientosClient cambios={(cambios || []).filter(esCambioVisible)} esTitular={!!profile?.es_titular} />
      </div>
    </div>
  );
}
