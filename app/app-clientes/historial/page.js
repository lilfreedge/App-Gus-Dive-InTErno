import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
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
        <Link href="/app-clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Clientes", href: "/app-clientes" }, { label: "Historial de órdenes" }]} />
        <h1 className="page-title">Historial de órdenes</h1>

        <HistorialClient ordenes={ordenes || []} clientes={clientes || []} />
      </div>
    </div>
  );
}
