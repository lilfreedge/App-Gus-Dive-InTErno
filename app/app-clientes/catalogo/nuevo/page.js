import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoServicioForm from "./form-client";

export default async function NuevoServicioPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Catálogo", href: "/app-clientes/catalogo" },
            { label: "Agregar servicio" },
          ]}
        />
        <h1 className="page-title">Agregar servicio</h1>

        <NuevoServicioForm />
      </div>
    </div>
  );
}
