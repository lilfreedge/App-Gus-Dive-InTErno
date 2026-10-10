import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevaPiezaForm from "./form-client";

// Gateado por equipos_clientes_agregar_codigo (feedback en vivo,
// 30-sep-2026, pedido explícito: permiso propio para AGREGAR códigos,
// separado de equipos_clientes_catalogo que solo deja ver la pantalla).
export default async function NuevaPiezaPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_agregar_codigo", "/app-clientes/catalogo/piezas");

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
            { label: "Códigos a cobrar", href: "/app-clientes/catalogo/piezas" },
            { label: "Registrar código" },
          ]}
        />
        <h1 className="page-title">Registrar código</h1>

        <NuevaPiezaForm />
      </div>
    </div>
  );
}
