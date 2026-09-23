import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaPiezaForm from "./form-client";

// Gateado por el permiso granular equipos_clientes_catalogo (item 15).
export default async function NuevaPiezaPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_catalogo", "/app-clientes/catalogo/piezas");

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/catalogo/piezas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Base de datos", href: "/app-clientes/catalogo" },
            { label: "Piezas", href: "/app-clientes/catalogo/piezas" },
            { label: "Agregar pieza" },
          ]}
        />
        <h1 className="page-title">Agregar pieza</h1>

        <NuevaPiezaForm />
      </div>
    </div>
  );
}
