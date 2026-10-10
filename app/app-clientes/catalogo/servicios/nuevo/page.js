import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import NuevoServicioForm from "./form-client";

// V30: gateado por "Registrar servicio en base de datos"
// (equipos_clientes_registrar_servicio, pedido explícito) -- antes bastaba
// con el permiso de ver Base de datos.
export default async function NuevoServicioPage() {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_registrar_servicio", "/app-clientes/catalogo/servicios");

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
            { label: "Registrar servicio" },
          ]}
        />
        <h1 className="page-title">Registrar servicio</h1>

        <NuevoServicioForm />
      </div>
    </div>
  );
}
