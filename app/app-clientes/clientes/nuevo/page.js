import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoClienteForm from "./form-client";

// Gateado por el permiso granular equipos_clientes_agregar_cliente
// (item 15, pedido explícito).
export default async function NuevoClientePage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_agregar_cliente", "/app-clientes/clientes");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: "Nuevo cliente" },
          ]}
        />
        <h1 className="page-title">Nuevo cliente</h1>

        <NuevoClienteForm />
      </div>
    </div>
  );
}
