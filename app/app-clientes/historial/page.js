import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import NavArrowsClientesServer from "@/components/NavArrowsClientesServer";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialClient from "./historial-client";

export default async function HistorialOrdenesPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const [{ data: ordenes }, { data: clientes }] = await Promise.all([
    supabase.from("ordenes_equipos_con_nombre").select("*").limit(500),
    supabase.from("clientes_equipos").select("id, nombre").order("nombre"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsClientesServer />
        <Breadcrumb items={[{ label: "App Clientes", href: "/app-clientes" }, { label: "Listado de órdenes" }]} />
        <h1 className="page-title">Listado de órdenes</h1>

        <HistorialClient ordenes={ordenes || []} clientes={clientes || []} />
      </div>
    </div>
  );
}
