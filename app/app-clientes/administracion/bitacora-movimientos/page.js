import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import { formatFecha } from "@/lib/format";
import { filasOrden } from "@/lib/historial-ordenes";

// "Bitácora movimientos en órdenes" (27-sep-2026, pedido explícito: "un
// boton en 'mas'... un registro de todas las veces que cualquier orden es
// editada. para enterarme quien cambio que en cada orden") -- botón
// propio en "Más", distinto de "Historial" (que mezcla ediciones Y
// movimientos anulados de órdenes Y equipos). Este solo trae ediciones de
// ordenes_equipos, sin filtrar por una orden en particular -- para ver de
// un vistazo quién cambió qué en cualquier orden. Mismo criterio de
// acceso que "Historial" (solo Titular) y misma fuente (historial_con_
// nombre), reutilizando filasOrden (lib/historial-ordenes.js) para no
// desincronizar la lista de campos entre las dos pantallas.
export default async function BitacoraMovimientosPage() {
  const supabase = createClient();
  await requireTitular(supabase);

  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "ordenes_equipos")
    .eq("accion", "editar")
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Más", href: "/app-clientes/mas" },
            { label: "Bitácora movimientos en órdenes" },
          ]}
        />
        <h1 className="page-title">Bitácora movimientos en órdenes</h1>
        <p className="page-subtitle">Quién editó qué, en cualquier orden -- las más recientes primero.</p>

        {!cambios || cambios.length === 0 ? (
          <div className="empty">Todavía no hay ediciones registradas.</div>
        ) : (
          cambios.map((c) => <TarjetaMovimiento key={c.id} cambio={c} />)
        )}
      </div>
    </div>
  );
}

function TarjetaMovimiento({ cambio }) {
  const d = cambio.datos_anteriores || {};
  const dn = cambio.datos_nuevos || null;
  const filas = filasOrden(d, dn);
  const titulo = `Orden No. ${d.no_orden_fisico ?? d.folio ?? "?"} editada`;

  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">{titulo}</div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <thead>
          <tr>
            <th>Campo</th>
            <th>Antes</th>
            <th>Después</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.label}>
              <td>{f.label}</td>
              <td>{f.antes}</td>
              <td>{f.despues}</td>
            </tr>
          ))}
          <tr>
            <td>Editado por</td>
            <td colSpan={2}>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de edición</td>
            <td colSpan={2}>{formatFecha(cambio.created_at)}</td>
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
