import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoServicioForm from "./form-client";

// Gateado por el permiso granular equipos_clientes_catalogo (item 15,
// pedido explícito) -- ver el catálogo sigue abierto para cualquiera
// con acceso a la app, esto solo gatea crear/editar.
export default async function NuevoServicioPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_catalogo", "/app-clientes/catalogo/servicios");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo/servicios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Base de datos", href: "/app-clientes/catalogo" },
            { label: "Servicios", href: "/app-clientes/catalogo/servicios" },
            { label: "Agregar servicio" },
          ]}
        />
        <h1 className="page-title">Agregar servicio</h1>

        <NuevoServicioForm />
      </div>
    </div>
  );
}
