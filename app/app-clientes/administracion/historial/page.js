import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";

// Historial de ediciones de órdenes -- solo el Titular entra aquí
// (pedido explícito del usuario, 23-sep-2026: "eso que solamente lo
// pueda ver yo como titular, por el momento"). La política RLS de
// cambios_historial también oculta tabla = 'ordenes_equipos' a
// administradores comunes (ver migration_17.sql), así que esto no
// aparece tampoco en el Historial de App Interno.
//
// ?orden=<id> (opcional, desde la ficha de una orden) filtra solo las
// ediciones de esa orden.
export default async function HistorialAdministracionPage({ searchParams }) {
  const supabase = createClient();
  await requireTitular(supabase);

  const ordenId = searchParams?.orden || "";

  let query = supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "ordenes_equipos")
    .order("created_at", { ascending: false })
    .limit(300);

  if (ordenId) query = query.eq("registro_id", ordenId);

  const { data: cambios } = await query;

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/administracion" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Clientes", href: "/app-clientes" },
            { label: "Administración", href: "/app-clientes/administracion" },
            { label: "Historial de ediciones" },
          ]}
        />

        {!cambios || cambios.length === 0 ? (
          <div className="empty">
            {ordenId ? "Esta orden todavía no tiene ediciones registradas." : "Todavía no hay ediciones registradas."}
          </div>
        ) : (
          cambios.map((c) => <TarjetaEdicion key={c.id} cambio={c} />)
        )}
      </div>
    </div>
  );
}

function TarjetaEdicion({ cambio }) {
  const d = cambio.datos_anteriores || {};
  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">
          Orden #{d.folio ?? "?"} editada
        </div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Cliente</td>
            <td>{d.cliente_nombre_snapshot || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Envío a</td>
            <td>{d.envio_a || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Fecha de retorno a tienda</td>
            <td>{d.fecha_retorno_tienda ? formatFechaDDMMAAAADeDate(d.fecha_retorno_tienda) : "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Fecha de listo para entrega</td>
            <td>{d.fecha_listo_entrega ? formatFechaDDMMAAAADeDate(d.fecha_listo_entrega) : "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Verificado por</td>
            <td>{d.verificado_por || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Fecha de notificación al cliente</td>
            <td>{d.fecha_notificacion_cliente ? formatFechaDDMMAAAADeDate(d.fecha_notificacion_cliente) : "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Fecha de entrega al cliente</td>
            <td>{d.fecha_entrega_cliente ? formatFechaDDMMAAAADeDate(d.fecha_entrega_cliente) : "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Nombre de quien recibe</td>
            <td>{d.nombre_recibe || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Factura</td>
            <td>{d.factura || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — Estado</td>
            <td>{d.estado || "—"}</td>
          </tr>
          <tr>
            <td>Editado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de edición</td>
            <td>{formatFecha(cambio.created_at)}</td>
          </tr>
        </tbody>
      </table>
      <Link
        href={`/app-clientes/ordenes/${cambio.registro_id}`}
        style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
      >
        Ver orden actual →
      </Link>
    </div>
  );
}
