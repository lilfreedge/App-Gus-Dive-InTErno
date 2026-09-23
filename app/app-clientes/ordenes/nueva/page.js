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

  const [{ data: clientes }, { data: equipos }, { data: servicios }] = await Promise.all([
    supabase.from("clientes_equipos").select("id, nombre, telefono").order("nombre"),
    supabase
      .from("equipos_del_cliente")
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie"),
    // Catálogo de servicios (23-sep-2026) -- reemplaza la lista fija que
    // antes estaba en form-client.js, ver migration_21.sql.
    supabase.from("servicios_catalogo").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/ordenes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Registro", href: "/app-clientes/ordenes" },
            { label: "Registrar orden" },
          ]}
        />
        <h1 className="page-title">Registrar orden</h1>

        <NuevaOrdenForm
          clientes={clientes || []}
          equipos={equipos || []}
          servicios={servicios || []}
          clientePreseleccionado={searchParams?.cliente || ""}
        />
      </div>
    </div>
  );
}
