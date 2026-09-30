import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import TarjetaBitacoraMovimiento from "@/components/TarjetaBitacoraMovimiento";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// Bitácora de una orden (27-sep-2026, feature Hold -- pedido explícito:
// "si, que la pueda ver quien sea por ahora") -- historial de cada Hold
// resuelto (motivo + Decisión del cliente) y cada repuesto "autorizado"
// que se eliminó (con su motivo). Vive en ordenes_equipos.bitacora_orden
// (jsonb, ver migration_32.sql).
//
// **Nota (30-sep-2026, feedback en vivo, pedido explícito):**
// - "haz que solo yo tenga ese acceso y los administradores" -- esta
//   pantalla pasó de ser visible a cualquiera con acceso a la app a ser
//   exclusiva de Titular/Administrador (mismo criterio que requireAdmin,
//   pero sin mandar a /dashboard -- notFound() se queda dentro de App
//   Clientes, igual que editar-datos/page.js).
// - "dentro de bitacora de orden, deben de figurar todos los movimientos
//   de la orden, asi como los movimientos que figuran en bitacora de
//   movimientos" -- ahora también se trae de historial_con_nombre cada
//   edición de ESTA orden en particular, y se mezcla en la misma línea de
//   tiempo con los Holds/autorizados (ordenado por fecha, lo más nuevo
//   primero), reutilizando TarjetaBitacoraMovimiento (misma tarjeta que
//   ya usa "Bitácora movimientos en órdenes") para no duplicar esa UI.
export default async function BitacoraOrdenPage({ params }) {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "equipos_clientes");
  if (!profile?.es_titular && !profile?.is_admin) notFound();

  const [{ data: o }, { data: ediciones }] = await Promise.all([
    supabase
      .from("ordenes_equipos")
      .select("id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, tipo_equipo_otro, bitacora_orden")
      .eq("id", params.id)
      .single(),
    supabase
      .from("historial_con_nombre")
      .select("*")
      .eq("tabla", "ordenes_equipos")
      .eq("accion", "editar")
      .eq("registro_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!o) notFound();

  const entradasBitacora = (o.bitacora_orden || []).map((e) => ({
    tipo: "bitacora",
    fechaOrden: new Date(e.fecha).getTime(),
    data: e,
  }));
  const entradasEdicion = (ediciones || []).map((c) => ({
    tipo: "edicion",
    fechaOrden: new Date(c.created_at).getTime(),
    data: c,
  }));
  const entradas = [...entradasBitacora, ...entradasEdicion].sort((a, b) => b.fechaOrden - a.fechaOrden);

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
          entradas.map((entrada, i) => {
            if (entrada.tipo === "edicion") {
              return <TarjetaBitacoraMovimiento key={`e-${entrada.data.id}`} cambio={entrada.data} />;
            }
            const e = entrada.data;
            return (
              <div key={`b-${i}`} className="card">
                <div className="list-item-top">
                  <span className="list-item-title">{e.texto}</span>
                </div>
                {e.detalle && <div style={{ fontSize: 14, marginTop: 4 }}>{e.detalle}</div>}
                {/* Duración del Hold agregada (pedido explícito, mid-flow,
                    con captura de pantalla: "que aparezca todo el detalle")
                    -- solo se puede calcular en las entradas guardadas desde
                    este cambio en adelante (fecha_inicio_hold nuevo). */}
                {e.fecha_inicio_hold && (
                  <div className="hint-text" style={{ marginTop: 4 }}>
                    Desde el {formatFechaDDMMAAAADeDate(e.fecha_inicio_hold)} hasta el {formatFechaDDMMAAAADeDate(e.fecha)} (
                    {Math.floor((new Date(e.fecha).getTime() - new Date(e.fecha_inicio_hold).getTime()) / (1000 * 60 * 60 * 24))} día
                    {Math.floor((new Date(e.fecha).getTime() - new Date(e.fecha_inicio_hold).getTime()) / (1000 * 60 * 60 * 24)) === 1 ? "" : "s"} en Hold)
                  </div>
                )}
                <div className="hint-text" style={{ marginTop: 6 }}>{formatFechaDDMMAAAADeDate(e.fecha)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
