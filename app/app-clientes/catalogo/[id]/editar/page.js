import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarServicioForm from "./form-client";

export default async function EditarServicioPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

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
        <Link href="/app-clientes/catalogo" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Catálogo", href: "/app-clientes/catalogo" },
            { label: servicio.nombre },
          ]}
        />
        <h1 className="page-title">Editar servicio</h1>

        <EditarServicioForm servicio={servicio} />
      </div>
    </div>
  );
}
