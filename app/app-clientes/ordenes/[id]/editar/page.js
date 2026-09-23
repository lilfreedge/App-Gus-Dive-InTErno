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
  await requirePermiso(supabase, "equipos_clientes");

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
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Historial de órdenes", href: "/app-clientes/historial" },
            { label: `#${orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Actualizar seguimiento" },
          ]}
        />
        <h1 className="page-title">Actualizar seguimiento</h1>
        <p className="page-subtitle">Todos estos campos son opcionales -- llénalos a medida que vaya avanzando la orden. El cambio queda anotado en el historial.</p>

        <EditarSeguimientoForm orden={orden} />
      </div>
    </div>
  );
}
