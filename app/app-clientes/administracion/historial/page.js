import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import { formatFecha } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { filasOrden } from "@/lib/historial-ordenes";

// "Historial" consolidado de App Equipos de clientes (item 31, pedido
// explícito, 27-sep-2026: "en mas, crea un boton de historial y ahi
// dentro pone los historiales que te dije anteriormente. tambien pon
// movimientos anulados" -- "asi como lo tenemos en app interno" -- mismo
// patrón que /admin/historial de App Interno: dos secciones, "Movimientos
// anulados" (accion = 'borrar') y "Ediciones" (accion = 'editar'), en vez
// de un botón por tabla. Reemplaza las dos páginas que había antes (esta,
// que solo traía ediciones de órdenes, y "historial-equipos" aparte) --
// ahora las dos tablas de App Equipos de clientes conviven acá. Se llega
// desde un solo botón "Historial" en "Más" (antes las dos vivían como
// botones sueltos en Administración). Solo el Titular entra, mismo
// criterio de siempre -- la política RLS de cambios_historial también
// sigue ocultando estas dos tablas del Historial de App Interno.
//
// ?orden=<id> (opcional, desde la ficha de una orden) sigue filtrando
// solo lo de esa orden.
//
// Cada tarjeta de "Ediciones" ahora muestra antes Y después (item 20,
// pedido explícito: "que en las ediciones aparezca el before and after")
// -- el "después" viene de cambios_historial.datos_nuevos, una columna
// nueva (migration_29.sql) que se empezó a llenar con esta entrega; las
// ediciones de ANTES de esa migración simplemente muestran "—" en esa
// columna, porque esa información nunca se guardó.
export default async function HistorialAdministracionPage({ searchParams }) {
  const supabase = createClient();
  await requireTitular(supabase);

  const ordenId = searchParams?.orden || "";

  let query = supabase
    .from("historial_con_nombre")
    .select("*")
    .in("tabla", ["ordenes_equipos", "equipos_del_cliente"])
    .order("created_at", { ascending: false })
    .limit(300);

  if (ordenId) query = query.eq("tabla", "ordenes_equipos").eq("registro_id", ordenId);

  const { data: cambios } = await query;

  const anulados = (cambios || []).filter((c) => c.accion === "borrar");
  const ediciones = (cambios || []).filter((c) => c.accion === "editar");

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
            { label: "Historial" },
          ]}
        />
        <h1 className="page-title">Historial</h1>

        {!ordenId && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>Movimientos anulados</div>
            {anulados.length > 0 ? (
              anulados.map((c) => <TarjetaAnulado key={c.id} cambio={c} />)
            ) : (
              <div className="empty">No hay movimientos anulados.</div>
            )}
          </>
        )}

        <div className="section-title" style={{ marginTop: ordenId ? 0 : undefined }}>Ediciones</div>
        {ediciones.length > 0 ? (
          ediciones.map((c) => <TarjetaEdicion key={c.id} cambio={c} />)
        ) : (
          <div className="empty">
            {ordenId ? "Esta orden todavía no tiene ediciones registradas." : "Todavía no hay ediciones registradas."}
          </div>
        )}
      </div>
    </div>
  );
}

function tituloTabla(tabla) {
  return tabla === "equipos_del_cliente" ? "Equipo" : "Orden";
}

function TarjetaAnulado({ cambio }) {
  const d = cambio.datos_anteriores || {};
  const esOrden = cambio.tabla === "ordenes_equipos";
  return (
    <div className="card anulado">
      <div className="list-item-top">
        <div className="list-item-title">{tituloTabla(cambio.tabla)} anulada</div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          {esOrden ? (
            <>
              <tr>
                <td>No. de orden</td>
                <td>{d.no_orden_fisico ?? d.folio ?? "?"}</td>
              </tr>
              <tr>
                <td>Cliente</td>
                <td>{d.cliente_nombre_snapshot || "—"}</td>
              </tr>
              <tr>
                <td>Equipo</td>
                <td>{tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "—"}</td>
              </tr>
              <tr>
                <td>Servicio</td>
                <td>{d.que_se_hara || "—"}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td>Tipo de equipo</td>
              <td>{tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "—"}</td>
            </tr>
          )}
          <tr>
            <td>Anulado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de anulación</td>
            <td>{formatFecha(cambio.created_at)}</td>
          </tr>
          {cambio.motivo && (
            <tr>
              <td>Motivo</td>
              <td>{cambio.motivo}</td>
            </tr>
          )}
        </tbody>
      </table>
      {esOrden && (
        <Link
          href={`/app-clientes/administracion/historial?orden=${cambio.registro_id}`}
          style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
        >
          Ver ediciones de esta orden →
        </Link>
      )}
    </div>
  );
}

// `filasOrden` (Campo/Antes/Después de una edición de ordenes_equipos)
// vive ahora en lib/historial-ordenes.js (27-sep-2026) -- se reutiliza
// también en "Bitácora movimientos en órdenes". `dn` (datos_nuevos) puede
// venir vacío en ediciones de antes de migration_29.sql.
function filasEquipo(d, dn) {
  const tipo = dn?.tipo_equipo || d.tipo_equipo;
  return [
    {
      label: "Tipo de equipo",
      antes: tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "—",
      despues: dn ? tipoEquipoLabel(dn.tipo_equipo, dn.tipo_equipo_otro) || "—" : "—",
    },
    { label: tipo === "Tanques" ? "Fabricante" : "Marca", antes: d.marca || "—", despues: dn?.marca || "—" },
    { label: "Modelo", antes: d.modelo || "—", despues: dn?.modelo || "—" },
    { label: "No. Serie", antes: d.serie || "—", despues: dn?.serie || "—" },
  ];
}

function TarjetaEdicion({ cambio }) {
  const d = cambio.datos_anteriores || {};
  const dn = cambio.datos_nuevos || null;
  const esOrden = cambio.tabla === "ordenes_equipos";
  const filas = esOrden ? filasOrden(d, dn) : filasEquipo(d, dn);
  const titulo = esOrden ? `Orden No. ${d.no_orden_fisico ?? d.folio ?? "?"} editada` : `${tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "Equipo"} editado`;

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
        href={esOrden ? `/app-clientes/ordenes/${cambio.registro_id}` : `/app-clientes/equipos/${cambio.registro_id}`}
        style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
      >
        {esOrden ? "Ver orden actual →" : "Ver equipo actual →"}
      </Link>
    </div>
  );
}
