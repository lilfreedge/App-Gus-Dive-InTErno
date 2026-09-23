import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarServicioForm from "./form-client";

// Gateado por el permiso granular equipos_clientes_catalogo (item 15).
export default async function EditarServicioPage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_catalogo", "/app-clientes/catalogo/servicios");

  const { data: servicio } = await supabase
    .from("servicios_catalogo")
    .select("id, nombre, activo")
    .eq("id", params.id)
    .maybeSingle();

  if (!servicio) notFound();

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
            { label: servicio.nombre },
          ]}
        />
        <h1 className="page-title">Editar servicio</h1>

        <EditarServicioForm servicio={servicio} />
      </div>
    </div>
  );
}
