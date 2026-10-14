import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarClienteForm from "./form-client";

// "Editar cliente" (feature nueva, ronda grande de feedback, 27-sep-2026,
// pedido explícito) -- corrige nombre/teléfono de un cliente ya
// registrado. Mismo patrón que "Editar equipo": permiso granular propio
// (equipos_clientes_editar_cliente), exclusivo de la tabla
// "Administradores" en Permisos (ver COLUMNAS_ADMIN en
// permisos-client.js), y queda anotado en Historial con antes/después
// (tabla clientes_equipos, ver migration_35.sql para la política RLS que
// habilita verlo con este mismo permiso).
export default async function EditarClientePage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_editar_cliente", `/app-clientes/clientes/${params.id}`);

  const { data: cliente } = await supabase
    .from("clientes_equipos")
    .select("id, nombre, telefono, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/clientes/${cliente.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: cliente.nombre, href: `/app-clientes/clientes/${cliente.id}` },
            { label: "Editar" },
          ]}
        />
        <h1 className="page-title">Editar cliente</h1>

        <EditarClienteForm cliente={cliente} />
      </div>
    </div>
  );
}
