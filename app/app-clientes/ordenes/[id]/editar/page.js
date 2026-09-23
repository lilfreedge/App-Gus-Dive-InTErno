import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import EditarSeguimientoForm from "./form-client";

// Actualizar seguimiento (renombrado de "Editar seguimiento", 23-sep-2026,
// feedback en vivo -- la mayoría de las veces se está llenando un campo
// por primera vez, no corrigiendo uno ya puesto) -- llena progresivamente
// los campos que van pasando con la orden (envío a, fechas de
// retorno/listo/entrega, verificado por, factura). Cada guardado anota
// el cambio en el historial (Titular) y recalcula el estado solo, según
// lib/ordenes-estado.js.
export default async function EditarSeguimientoPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  // "Verificado por" solo lo puede llenar el Titular o un Administrador
  // (pedido explícito, 23-sep-2026: "por el momento, el 'verificado por'
  // solamente lo podré llenar yo y a quien yo le de acceso como
  // administrador") -- mismo profiles.is_admin de toda la cuenta.
  const puedeVerificar = !!profile?.es_titular || !!profile?.is_admin;

  const { data: orden } = await supabase
    .from("ordenes_equipos")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();

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
            { label: `#${orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Actualizar estado de orden" },
          ]}
        />
        <h1 className="page-title">Actualizar estado de orden</h1>
        <p className="page-subtitle">Todos estos campos son opcionales -- llénalos a medida que vaya avanzando la orden. El cambio queda anotado en el historial.</p>

        <EditarSeguimientoForm orden={orden} puedeVerificar={puedeVerificar} />
      </div>
    </div>
  );
}
