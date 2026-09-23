import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import AgregarEquiposForm from "./form-client";

// Agregar equipo(s) a un cliente ya existente -- pedido explícito,
// 23-sep-2026 ("agregar opcion para registrar varios equipos a nombre
// de este cliente"): antes solo se podía crear un equipo a la vez,
// inline, desde el formulario de "Registrar orden". Esta pantalla deja
// cargar varios de una sola vez, sin tener que pasar por una orden.
// Gateada por el permiso granular equipos_clientes_agregar_equipo
// (item 15, pedido explícito).
export default async function NuevosEquiposPage({ params }) {
  const supabase = createClient();
  await requirePermisoClientes(supabase, "equipos_clientes_agregar_equipo", `/app-clientes/clientes/${params.id}`);

  const { data: cliente } = await supabase
    .from("clientes_equipos")
    .select("id, nombre")
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
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Listado de clientes", href: "/app-clientes/clientes" },
            { label: cliente.nombre, href: `/app-clientes/clientes/${cliente.id}` },
            { label: "Agregar equipo" },
          ]}
        />
        <h1 className="page-title">Agregar equipo a {cliente.nombre}</h1>
        <p className="page-subtitle">Puedes agregar varios de una vez -- usa &quot;+ Agregar otro equipo&quot; para sumar más filas.</p>

        <AgregarEquiposForm clienteId={cliente.id} />
      </div>
    </div>
  );
}
