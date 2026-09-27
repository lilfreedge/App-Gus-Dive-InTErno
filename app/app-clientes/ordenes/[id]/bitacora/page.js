import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// Bitácora de una orden (27-sep-2026, feature Hold -- pedido explícito:
// "si, que la pueda ver quien sea por ahora") -- historial de cada Hold
// resuelto (motivo + Decisión del cliente) y cada repuesto "autorizado"
// que se eliminó (con su motivo). Vive en ordenes_equipos.bitacora_orden
// (jsonb, ver migration_32.sql), visible a cualquiera con acceso a la
// app -- a diferencia de "Ver historial de ediciones" (Titular), esta
// pantalla NO está gateada a Titular.
export default async function BitacoraOrdenPage({ params }) {
  const supabase = createClient();
  await requirePermiso(supabase, "equipos_clientes");

  const { data: o } = await supabase
    .from("ordenes_equipos")
    .select("id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, bitacora_orden")
    .eq("id", params.id)
    .single();

  if (!o) notFound();

  const entradas = [...(o.bitacora_orden || [])].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={`/app-clientes/ordenes/${o.id}`} className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
            { label: `No. ${o.no_orden_fisico ?? o.folio}`, href: `/app-clientes/ordenes/${o.id}` },
            { label: "Bitácora" },
          ]}
        />
        <h1 className="page-title">Bitácora de la orden</h1>
        <p className="page-subtitle">
          No. {o.no_orden_fisico ?? o.folio} — {o.cliente_nombre_snapshot || "—"} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
        </p>

        {entradas.length === 0 ? (
          <div className="card">
            <div className="empty">Esta orden todavía no tiene nada en la bitácora.</div>
          </div>
        ) : (
          entradas.map((e, i) => (
            <div key={i} className="card">
              <div className="list-item-top">
                <span className="list-item-title">{e.texto}</span>
              </div>
              {e.detalle && <div style={{ fontSize: 14, marginTop: 4 }}>{e.detalle}</div>}
              <div className="hint-text" style={{ marginTop: 6 }}>{formatFechaDDMMAAAADeDate(e.fecha)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
