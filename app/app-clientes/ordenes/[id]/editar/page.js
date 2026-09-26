import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import EditarSeguimientoForm from "./form-client";

// Actualizar seguimiento (renombrado de "Editar seguimiento", 23-sep-2026,
// feedback en vivo -- la mayoría de las veces se está llenando un campo
// por primera vez, no corrigiendo uno ya puesto) -- llena progresivamente
// los campos que van pasando con la orden (envío a, fechas de
// retorno/listo/entrega, verificado por, factura). Cada guardado anota
// el cambio en el historial (Titular) y recalcula el estado solo, según
// lib/ordenes-estado.js.
export default async function EditarSeguimientoPage({ params, searchParams }) {
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

  // BUG corregido (item 11a, reportado en vivo, 26-sep-2026: "cuando le
  // doy me abre el actualizar estado de orden desde el 'listado de
  // ordenes' en vez de 'registro de ordenes'"). Causa: esta pantalla tiene
  // dos puntos de entrada -- el botón "Actualizar estado de orden" de la
  // ficha (que sí viene de Listado de órdenes) y el atajo directo agregado
  // en Registro de Órdenes (que se salta la ficha) -- pero la miga de pan
  // mostraba siempre "Listado de órdenes" sin importar de cuál se vino.
  // Arreglo: el atajo de Registro de Órdenes ahora agrega ?from=registro a
  // su link, y esta página arma la miga según eso.
  const vieneDeRegistro = searchParams?.from === "registro";

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
            vieneDeRegistro
              ? { label: "Registro de Órdenes", href: "/app-clientes/ordenes" }
              : { label: "Listado de órdenes", href: "/app-clientes/historial" },
            { label: `No. ${orden.no_orden_fisico ?? orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
            { label: "Actualizar estado de orden" },
          ]}
        />
        <h1 className="page-title">Actualizar estado de orden</h1>
        <p className="page-subtitle">Todos estos campos son opcionales -- llénalos a medida que vaya avanzando la orden. El cambio queda anotado en el historial.</p>

        {/* Resumen de la orden que se está actualizando (item 26, pedido
            explícito, 26-sep-2026: "agregar aqui en la parte de arriba
            datos sobre la orden que se esta actualizando, numero de orden,
            cliente y el equipo"). */}
        <div className="card" style={{ padding: "12px 16px", marginBottom: 16, fontSize: 14 }}>
          <strong>No. {orden.no_orden_fisico ?? orden.folio}</strong> — {orden.cliente_nombre_snapshot || "—"} —{" "}
          {tipoEquipoLabel(orden.tipo_equipo, orden.tipo_equipo_otro)}
        </div>

        <EditarSeguimientoForm orden={orden} puedeVerificar={puedeVerificar} />
      </div>
    </div>
  );
}
