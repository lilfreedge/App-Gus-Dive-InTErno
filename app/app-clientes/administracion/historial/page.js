import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";

// "Historial" consolidado de App Equipos de clientes (item 31, pedido
// explícito, 27-sep-2026: "en mas, crea un boton de historial y ahi
// dentro pone los historiales que te dije anteriormente. tambien pon
// movimientos anulados" -- "asi como lo tenemos en app interno") --
// reemplaza las dos páginas que había antes (esta, que solo traía
// ediciones de órdenes, y "historial-equipos" aparte) -- ahora las 3
// tablas de App Equipos de clientes conviven acá. Se llega desde un solo
// botón "Historial" en "Más". Solo quien tenga el permiso granular entra
// -- la política RLS de cambios_historial también sigue ocultando estas
// tablas del Historial de App Interno.
//
// Reorganizado en pestañas por categoría (item 21, feedback sobre v40,
// pedido explícito: "reorganiza historial en botones por categoria,
// ejemplo ordenes, equipos, clientes, anulados") -- antes eran 2 listas
// largas mezclando las 3 tablas ("Movimientos anulados" y "Ediciones");
// ahora la elección de categoría vive en historial-client.js (necesita
// estado de React para las pestañas), esta página solo trae los datos y
// gatea el permiso, igual que siempre.
//
// ?orden=<id> (opcional, desde la ficha de una orden) sigue filtrando
// solo lo de esa orden -- ahí historial-client.js muestra sus ediciones
// directo, sin pestañas.
export default async function HistorialAdministracionPage({ searchParams }) {
  const supabase = createClient();
  // Permiso granular nuevo (ronda grande de feedback, 27-sep-2026, pedido
  // explícito) -- antes esta pantalla era exclusiva del Titular. La
  // política RLS de cambios_historial se actualizó en migration_35.sql
  // para que quien tenga este permiso también pueda VER las filas (antes
  // solo is_titular() podía, ni Administradores).
  await requirePermisoClientes(supabase, "equipos_clientes_historial", "/app-clientes/mas");

  const ordenId = searchParams?.orden || "";

  // "clientes_equipos" sumada (feature "Editar cliente") -- ver
  // filasCliente() en historial-client.js.
  let query = supabase
    .from("historial_con_nombre")
    .select("*")
    .in("tabla", ["ordenes_equipos", "equipos_del_cliente", "clientes_equipos"])
    .order("created_at", { ascending: false })
    .limit(300);

  if (ordenId) query = query.eq("tabla", "ordenes_equipos").eq("registro_id", ordenId);

  const { data: cambios } = await query;

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
            { label: "Historial" },
          ]}
        />
        <h1 className="page-title">Historial</h1>

        <HistorialClient ordenId={ordenId} cambios={cambios || []} />
      </div>
    </div>
  );
}
