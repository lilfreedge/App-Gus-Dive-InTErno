import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarPiezaForm from "./form-client";

// Gateado por el permiso granular equipos_clientes_catalogo (item 15).
export default async function EditarPiezaPage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_catalogo", "/app-clientes/catalogo/piezas");

  const { data: pieza } = await supabase
    .from("piezas_catalogo")
    .select("id, nombre, activo")
    .eq("id", params.id)
    .maybeSingle();

  if (!pieza) notFound();

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
            { label: pieza.nombre },
          ]}
        />
        <h1 className="page-title">Editar pieza</h1>

        <EditarPiezaForm pieza={pieza} />
      </div>
    </div>
  );
}
