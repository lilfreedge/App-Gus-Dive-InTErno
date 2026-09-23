import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaOrdenForm from "./form-client";

// Registrar orden -- App Equipos Clientes (23-sep-2026, primera versión
// real). Si viene ?cliente=<id> (desde la ficha de un cliente), llega
// preseleccionado.
export default async function NuevaOrdenPage({ searchParams }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: clientes } = await supabase
    .from("clientes_equipos")
    .select("id, nombre, telefono")
    .order("nombre");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "App Clientes", href: "/app-clientes" }, { label: "Registrar orden" }]} />
        <h1 className="page-title">Registrar orden</h1>

        <NuevaOrdenForm clientes={clientes || []} clientePreseleccionado={searchParams?.cliente || ""} />
      </div>
    </div>
  );
}
