import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import HistorialRestoreButton from "@/components/HistorialRestoreButton";
import { formatFecha } from "@/lib/format";

export default async function HistorialCambiosPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "historial");
  const esTitular = !!profile?.es_titular;
  const esAdmin = esTitular || !!profile?.is_admin;

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
          anulados.map((c) => <TarjetaAnulado key={c.id} cambio={c} esTitular={esTitular} esAdmin={esAdmin} />)
        ) : (
          <div className="empty">No hay movimientos anulados.</div>
        )}

        <div className="section-title">Ediciones</div>
        {ediciones.length > 0 ? (
          ediciones.map((c) => <TarjetaEdicion key={c.id} cambio={c} esTitular={esTitular} />)
        ) : (
          <div className="empty">No hay ediciones registradas.</div>
        )}
      </div>
    </div>
  );
}

function tituloRegistro(tabla) {
  if (tabla === "salidas") return "Salida";
  if (tabla === "llenados_tanques") return "Llenado";
  if (tabla === "articulos") return "Código de catálogo";
  return "Cambio de nombre";
}

function TarjetaAnulado({ cambio, esTitular, esAdmin }) {
  const d = cambio.datos_anteriores || {};
  const esRestaurable = cambio.tabla !== "profiles";
  return (
    <div className="card anulado">
      <div className="list-item-top">
        <div className="list-item-title">
          {tituloRegistro(cambio.tabla)} {cambio.tabla === "llenados_tanques" ? "borrado" : "borrada"}
        </div>
        <div className="row-actions">
          {esAdmin && esRestaurable && <HistorialRestoreButton cambio={cambio} />}
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
        </div>
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>No.</td>
            <td>{d.folio ?? "?"}</td>
          </tr>
          <tr>
            <td>Contenido</td>
            <td>{contenido(cambio.tabla, d)}</td>
          </tr>
          {d.nota && (
            <tr>
              <td>Nota</td>
              <td>{d.nota}</td>
            </tr>
          )}
          <tr>
            <td>Registrado originalmente por</td>
            <td>{d.nombre_usuario_snapshot || "—"}</td>
          </tr>
          <tr>
            <td>Fecha de registro original</td>
            <td>{d.created_at ? formatFecha(d.created_at) : "—"}</td>
          </tr>
          <tr>
            <td>Borrado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de borrado</td>
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
    </div>
  );
}

function TarjetaEdicion({ cambio, esTitular }) {
  const d = cambio.datos_anteriores || {};

  if (cambio.tabla === "profiles") {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">Cambio de nombre</div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
        </div>
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

  if (cambio.tabla === "articulos") {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">Código de catálogo editado</div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
        </div>
        <table className="table-mini" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Código</td>
              <td>{d.nombre || "—"}</td>
            </tr>
            <tr>
              <td>Descripción antes de editar</td>
              <td>{d.descripcion || "—"}</td>
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
      </div>
    );
  }

  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">
          {tituloRegistro(cambio.tabla)} {cambio.tabla === "llenados_tanques" ? "editado" : "editada"}
        </div>
        {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>No.</td>
            <td>{d.folio ?? "?"}</td>
          </tr>
          <tr>
            <td>Antes de editar</td>
            <td>{contenido(cambio.tabla, d)}</td>
          </tr>
          <tr>
            <td>Registrado originalmente por</td>
            <td>{d.nombre_usuario_snapshot || "—"}</td>
          </tr>
          <tr>
            <td>Fecha de registro original</td>
            <td>{d.created_at ? formatFecha(d.created_at) : "—"}</td>
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
    </div>
  );
}

function contenido(tabla, d) {
  if (tabla === "salidas") {
    return `${d.articulo} x${d.cantidad} · ${d.motivo}${d.autorizado_por ? ` · autorizó ${d.autorizado_por}` : ""}`;
  }
  if (tabla === "llenados_tanques") {
    return `${d.cantidad} tanque(s) · ${d.tipo_gas || "Aire"}`;
  }
  return "";
}
