import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoClienteForm from "./form-client";

export default async function NuevoClientePage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/clientes" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
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
