import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import { formatFecha } from "@/lib/format";

export default async function HistorialCambiosPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "historial");

  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .limit(300);

  const anulados = (cambios || []).filter((c) => c.accion === "borrar");
  const ediciones = (cambios || []).filter((c) => c.accion === "editar");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <h1 className="page-title">Historial</h1>

        <div className="section-title">Movimientos anulados</div>
        {anulados.length > 0 ? (
          anulados.map((c) => <TarjetaAnulado key={c.id} cambio={c} />)
        ) : (
          <div className="empty">No hay movimientos anulados.</div>
        )}

        <div className="section-title">Ediciones</div>
        {ediciones.length > 0 ? (
          ediciones.map((c) => <TarjetaEdicion key={c.id} cambio={c} />)
        ) : (
          <div className="empty">No hay ediciones registradas.</div>
        )}
      </div>
    </div>
  );
}

function tituloRegistro(tabla, datos) {
  if (tabla === "salidas") return `Salida #${datos.folio ?? "?"}`;
  if (tabla === "llenados_tanques") return `Llenado #${datos.folio ?? "?"}`;
  return "Cambio de nombre";
}

function TarjetaAnulado({ cambio }) {
  const d = cambio.datos_anteriores || {};
  return (
    <div className="card anulado">
      <div className="list-item-title">
        {tituloRegistro(cambio.tabla, d)} {cambio.tabla === "llenados_tanques" ? "borrado" : "borrada"}
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Contenido</td>
            <td>{contenido(cambio.tabla, d)}</td>
          </tr>
          <tr>
            <td>Borrado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de borrado</td>
            <td>{formatFecha(cambio.created_at)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TarjetaEdicion({ cambio }) {
  const d = cambio.datos_anteriores || {};

  if (cambio.tabla === "profiles") {
    return (
      <div className="card edicion">
        <div className="list-item-title">Cambio de nombre</div>
        <table className="table-mini" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Usuario</td>
              <td>{cambio.full_name}</td>
            </tr>
            <tr>
              <td>De</td>
              <td>{d.full_name}</td>
            </tr>
            <tr>
              <td>A</td>
              <td>{cambio.full_name}</td>
            </tr>
            <tr>
              <td>Fecha</td>
              <td>{formatFecha(cambio.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="card edicion">
      <div className="list-item-title">
        {tituloRegistro(cambio.tabla, d)} {cambio.tabla === "llenados_tanques" ? "editado" : "editada"}
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Antes de editar</td>
            <td>{contenido(cambio.tabla, d)}</td>
          </tr>
          <tr>
            <td>Editado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha</td>
            <td>{formatFecha(cambio.created_at)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function contenido(tabla, d) {
  if (tabla === "salidas") {
    return `${d.articulo} x${d.cantidad} · ${d.motivo}${d.autorizado_por ? ` · autorizó ${d.autorizado_por}` : ""}`;
  }
  if (tabla === "llenados_tanques") {
    return `${d.cantidad} tanque(s) · ${d.tipo_gas || "Aire"}${d.nota ? ` · nota "${d.nota}"` : ""}`;
  }
  return "";
}
