import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import HistorialRestoreButton from "@/components/HistorialRestoreButton";
import { formatFecha } from "@/lib/format";

export default async function HistorialCambiosPage() {
  const supabase = createClient();
  const { profile } = await requirePermiso(supabase, "historial");
  const esTitular = !!profile?.es_titular;
  const esAdmin = esTitular || !!profile?.is_admin;

  // Las ediciones de ordenes_equipos (App Clientes) no se muestran acá --
  // son Titular-only, tienen su propia página en /app-clientes/administracion/historial
  // (23-sep-2026). La política RLS de cambios_historial ya las oculta a
  // administradores comunes; este filtro además evita que aparezcan sin
  // formato ("Cambio de nombre" por defecto) para el Titular acá.
  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .neq("tabla", "ordenes_equipos")
    .limit(300);

  const anulados = (cambios || []).filter((c) => c.accion === "borrar");
  const ediciones = (cambios || []).filter((c) => c.accion === "editar");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <NavArrowsServer />
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Historial" }]} />

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
  if (tabla === "inspecciones_visuales") return "Inspección visual";
  if (tabla === "mantenimientos_reguladores") return "Mantenimiento de regulador";
  return "Cambio de nombre";
}

// Algunas tablas tienen nombre masculino ("el llenado", "el mantenimiento")
// y otras femenino ("la salida", "la inspección") — decide qué terminación
// usar para "borrado/a" y "editado/a" en las tarjetas genéricas de abajo.
function esMasculino(tabla) {
  return ["llenados_tanques", "mantenimientos_reguladores", "tanques_alquiler", "reguladores_alquiler"].includes(
    tabla
  );
}

function TarjetaAnulado({ cambio, esTitular, esAdmin }) {
  const d = cambio.datos_anteriores || {};
  const esRestaurable = cambio.tabla !== "profiles";
  return (
    <div className="card anulado">
      <div className="list-item-top">
        <div className="list-item-title">
          {tituloRegistro(cambio.tabla)} {esMasculino(cambio.tabla) ? "borrado" : "borrada"}
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

  if (cambio.tabla === "tanques_alquiler" || cambio.tabla === "reguladores_alquiler") {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">
            {cambio.tabla === "tanques_alquiler" ? "Tanque de catálogo editado" : "Regulador de catálogo editado"}
          </div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
        </div>
        <table className="table-mini" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Código</td>
              <td>{d.codigo || "—"}</td>
            </tr>
            <tr>
              <td>Descripción antes de editar</td>
              <td>{d.descripcion || "—"}</td>
            </tr>
            {d.serie && (
              <tr>
                <td>Serie antes de editar</td>
                <td>{d.serie}</td>
              </tr>
            )}
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

  if (cambio.tabla === "compresores") {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">Compresor de catálogo editado</div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
        </div>
        <table className="table-mini" style={{ marginTop: 8 }}>
          <tbody>
            <tr>
              <td>Código</td>
              <td>{d.codigo || "—"}</td>
            </tr>
            <tr>
              <td>Descripción antes de editar</td>
              <td>{d.descripcion || "—"}</td>
            </tr>
            <tr>
              <td>Marca antes de editar</td>
              <td>{d.marca || "—"}</td>
            </tr>
            <tr>
              <td>Modelo antes de editar</td>
              <td>{d.modelo || "—"}</td>
            </tr>
            <tr>
              <td>No. Bloque antes de editar</td>
              <td>{d.no_bloque || "—"}</td>
            </tr>
            <tr>
              <td>Serie antes de editar</td>
              <td>{d.serie || "—"}</td>
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
          {tituloRegistro(cambio.tabla)} {esMasculino(cambio.tabla) ? "editado" : "editada"}
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
  if (tabla === "inspecciones_visuales") {
    return `${d.tanque_codigo_snapshot || "?"} · ${d.resultado || "?"}${d.nota ? ` · ${d.nota}` : ""}`;
  }
  if (tabla === "mantenimientos_reguladores") {
    const partes = [
      d.regulador_codigo_snapshot || "?",
      `Limpieza ultrasonido: ${d.limpieza_ultrasonido ? "Sí" : "No"}`,
      `Presión intermedia: ${d.presion_intermedia ? "Sí" : "No"}`,
      `O-rings: ${d.o_rings || "Ninguno"}`,
    ];
    if (d.detalle) partes.push(d.detalle);
    return partes.join(" · ");
  }
  return "";
}
