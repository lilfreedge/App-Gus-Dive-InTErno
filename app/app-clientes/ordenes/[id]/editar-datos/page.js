import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarDatosOrdenForm from "./form-client";

// Editar los datos de una orden más allá del seguimiento (item 7, pedido
// explícito, 26-sep-2026: "editar/anular una orden más allá del
// seguimiento (cliente/equipo/servicio/No. de orden)") -- distinta de
// "Actualizar estado de orden" (esa es el seguimiento que se va
// llenando; esta es corregir un dato mal capturado al registrar). Solo
// Titular/Administrador (ver RegistroActions en la ficha de la orden, y
// la política de borrado de la base de datos, migration_16.sql, que ya
// era Titular/Admin-only).
export default async function EditarDatosOrdenPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  if (!profile?.es_titular && !profile?.is_admin) notFound();

  const { data: orden } = await supabase
    .from("ordenes_equipos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();

  const [{ data: clientes }, { data: equipos }, { data: servicios }] = await Promise.all([
    supabase.from("clientes_equipos").select("id, nombre, telefono").order("nombre"),
    supabase.from("equipos_del_cliente").select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo, serie"),
    // `tipos_equipo` (item 21, migration_29.sql) filtra qué servicios se
    // ofrecen según el tipo de Equipo elegido -- mismo criterio que
    // "Registrar orden".
    supabase.from("servicios_catalogo").select("id, nombre, tipos_equipo").eq("activo", true).order("nombre"),
  ]);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/ordenes/${params.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Listado de órdenes", href: "/app-clientes/historial" },
            { label: `No. ${orden.no_orden_fisico ?? orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Editar orden" },
          ]}
        />
        <h1 className="page-title">Editar orden</h1>
        <p className="page-subtitle">
          Corrige el No. de orden, cliente, equipo o servicio. Para el resto del seguimiento, usa &quot;Actualizar estado de orden&quot;.
        </p>

        <EditarDatosOrdenForm orden={orden} clientes={clientes || []} equipos={equipos || []} servicios={servicios || []} />
      </div>
    </div>
  );
}
