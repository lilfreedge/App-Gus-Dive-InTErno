import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NavArrowsServer from "@/components/NavArrowsServer";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import HistorialRestoreButton from "@/components/HistorialRestoreButton";
import BorrarTodoHistorialButton from "@/components/BorrarTodoHistorialButton";
import { formatFecha, formatFechaDDMMAAAADeDate, formatMesAnio } from "@/lib/format";

export default async function HistorialCambiosPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "historial");
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
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Historial de anulaciones y ediciones" }]} />

        <div className="section-title">Movimientos anulados</div>
        {/* Botones separados de "Borrar todo" (28-sep-2026, pedido
            explícito: "en app interno, agregame boton para borrar todo
            aqui, separado. uno para anulaciones y otro para ediciones")
            -- mismo componente ya usado en App Equipos de clientes
            (Bitácora e Historial), acotado con `excluir` en vez de una
            lista de tablas para no quedar desactualizado si se agrega una
            tabla nueva a App Interno más adelante. */}
        {esTitular && (
          <div style={{ marginBottom: 14 }}>
            <BorrarTodoHistorialButton
              filtro={{ accion: "borrar" }}
              excluir={{ tabla: "ordenes_equipos" }}
              etiqueta="todos los movimientos anulados"
            />
          </div>
        )}
        {anulados.length > 0 ? (
          anulados.map((c) => <TarjetaAnulado key={c.id} cambio={c} esTitular={esTitular} esAdmin={esAdmin} />)
        ) : (
          <div className="empty">No hay movimientos anulados.</div>
        )}

        <div className="section-title">Ediciones</div>
        {esTitular && (
          <div style={{ marginBottom: 14 }}>
            <BorrarTodoHistorialButton
              filtro={{ accion: "editar" }}
              excluir={{ tabla: "ordenes_equipos" }}
              etiqueta="todas las ediciones"
            />
          </div>
        )}
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
  if (tabla === "pruebas_hidrostaticas") return "Prueba hidrostática";
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

// Filas "Campo / Antes / Después" por tabla (item 11, pedido explícito,
// 27-sep-2026: "pon este mismo formato de historial en app interno") --
// mismo patrón que filasOrden/filasEquipo de
// app/app-clientes/administracion/historial/page.js. `dn` (datos_nuevos)
// viene null en ediciones de antes de esta entrega (v37) -- esas
// simplemente muestran "—" en la columna Después, porque ese "después"
// nunca se guardó.
function filasArticulo(d, dn) {
  return [
    { label: "Código", antes: d.nombre || "—", despues: dn?.nombre || "—" },
    { label: "Descripción", antes: d.descripcion || "—", despues: dn?.descripcion || "—" },
  ];
}

function filasSalida(d, dn) {
  return [
    { label: "Artículo / pieza", antes: d.articulo || "—", despues: dn?.articulo || "—" },
    { label: "Cantidad", antes: d.cantidad ?? "—", despues: dn?.cantidad ?? "—" },
    { label: "Motivo", antes: d.motivo || "—", despues: dn?.motivo || "—" },
    { label: "Autorizado por", antes: d.autorizado_por || "—", despues: dn?.autorizado_por || "—" },
    { label: "Nota", antes: d.nota || "—", despues: dn?.nota || "—" },
  ];
}

function filasLlenado(d, dn) {
  return [
    { label: "Cantidad de tanques", antes: d.cantidad ?? "—", despues: dn?.cantidad ?? "—" },
    { label: "Tipo de gas", antes: d.tipo_gas || "—", despues: dn?.tipo_gas || "—" },
    { label: "Nota", antes: d.nota || "—", despues: dn?.nota || "—" },
  ];
}

function filasInspeccionVisual(d, dn) {
  return [
    { label: "Tanque", antes: d.tanque_codigo_snapshot || "—", despues: dn?.tanque_codigo_snapshot || "—" },
    { label: "Resultado", antes: d.resultado || "—", despues: dn?.resultado || "—" },
    { label: "Nota", antes: d.nota || "—", despues: dn?.nota || "—" },
  ];
}

function filasPruebaHidrostatica(d, dn) {
  const f = (iso) => formatMesAnio(iso);
  return [
    { label: "Tanque", antes: d.tanque_codigo_snapshot || "—", despues: dn?.tanque_codigo_snapshot || "—" },
    { label: "Fecha de la prueba", antes: f(d.fecha_prueba), despues: dn ? f(dn.fecha_prueba) : "—" },
    { label: "Resultado", antes: d.resultado || "—", despues: dn?.resultado || "—" },
    { label: "Nota", antes: d.nota || "—", despues: dn?.nota || "—" },
  ];
}

function filasMantenimientoRegulador(d, dn) {
  const siNo = (v) => (v ? "Sí" : "No");
  return [
    { label: "Regulador", antes: d.regulador_codigo_snapshot || "—", despues: dn?.regulador_codigo_snapshot || "—" },
    { label: "Limpieza ultrasonido", antes: siNo(d.limpieza_ultrasonido), despues: dn ? siNo(dn.limpieza_ultrasonido) : "—" },
    { label: "Presión intermedia", antes: siNo(d.presion_intermedia), despues: dn ? siNo(dn.presion_intermedia) : "—" },
    { label: "O-rings", antes: d.o_rings || "Ninguno", despues: dn ? dn.o_rings || "Ninguno" : "—" },
    { label: "Nota", antes: d.detalle || "—", despues: dn?.detalle || "—" },
  ];
}

function filasTanqueCatalogo(d, dn) {
  return [
    { label: "Código", antes: d.codigo || "—", despues: dn?.codigo || "—" },
    { label: "Descripción", antes: d.descripcion || "—", despues: dn?.descripcion || "—" },
    { label: "Número de serie", antes: d.serie || "—", despues: dn?.serie || "—" },
  ];
}

function filasReguladorCatalogo(d, dn) {
  return [
    { label: "Código", antes: d.codigo || "—", despues: dn?.codigo || "—" },
    { label: "Serie", antes: d.serie || "—", despues: dn?.serie || "—" },
    { label: "1ra etapa", antes: d.primera_etapa || "—", despues: dn?.primera_etapa || "—" },
    { label: "2da etapa", antes: d.segunda_etapa || "—", despues: dn?.segunda_etapa || "—" },
    { label: "Octopus", antes: d.octopus || "—", despues: dn?.octopus || "—" },
    { label: "Manómetro", antes: d.manometro || "—", despues: dn?.manometro || "—" },
  ];
}

function filasCompresor(d, dn) {
  return [
    { label: "Descripción", antes: d.descripcion || "—", despues: dn?.descripcion || "—" },
    { label: "Código", antes: d.codigo || "—", despues: dn?.codigo || "—" },
    { label: "Marca", antes: d.marca || "—", despues: dn?.marca || "—" },
    { label: "Modelo", antes: d.modelo || "—", despues: dn?.modelo || "—" },
    { label: "No. Bloque", antes: d.no_bloque || "—", despues: dn?.no_bloque || "—" },
    { label: "Serie", antes: d.serie || "—", despues: dn?.serie || "—" },
  ];
}

// mantenimientos_compresores no tenía una tarjeta propia (caía en el
// genérico de abajo, que no lo cubría bien -- mostraba "?" en "No." y
// nada en "Contenido"). Se corrige de paso al aplicar el item 11.
function filasMantenimientoCompresor(d, dn) {
  const f = (iso) => (iso ? formatFechaDDMMAAAADeDate(iso) : "—");
  return [
    { label: "Compresor", antes: d.compresor_codigo_snapshot || "—", despues: dn?.compresor_codigo_snapshot || "—" },
    { label: "Tipo de mantenimiento", antes: d.tipo_mantenimiento || "—", despues: dn?.tipo_mantenimiento || "—" },
    { label: "Responsable", antes: d.responsable || "—", despues: dn?.responsable || "—" },
    { label: "Fecha", antes: f(d.fecha), despues: dn ? f(dn.fecha) : "—" },
    { label: "Horómetro", antes: d.horometro ?? "—", despues: dn?.horometro ?? "—" },
    { label: "Nivel de aceite", antes: d.nivel_aceite || "—", despues: dn?.nivel_aceite || "—" },
    { label: "Limpieza compresor", antes: d.limpieza_compresor || "—", despues: dn?.limpieza_compresor || "—" },
    { label: "Estado de manguera", antes: d.estado_manguera || "—", despues: dn?.estado_manguera || "—" },
    { label: "Estado de filtro principal", antes: d.estado_filtro_principal || "—", despues: dn?.estado_filtro_principal || "—" },
    { label: "Estado de filtro final", antes: d.estado_filtro_final || "—", despues: dn?.estado_filtro_final || "—" },
    { label: "Limpieza de espacio", antes: d.limpieza_espacio || "—", despues: dn?.limpieza_espacio || "—" },
    { label: "Otra inspección", antes: d.otra_inspeccion || "—", despues: dn?.otra_inspeccion || "—" },
    { label: "Proceso y piezas utilizadas", antes: d.proceso_piezas || "—", despues: dn?.proceso_piezas || "—" },
    { label: "Notas", antes: d.notas || "—", despues: dn?.notas || "—" },
  ];
}

const FILAS_POR_TABLA = {
  articulos: filasArticulo,
  salidas: filasSalida,
  llenados_tanques: filasLlenado,
  inspecciones_visuales: filasInspeccionVisual,
  pruebas_hidrostaticas: filasPruebaHidrostatica,
  mantenimientos_reguladores: filasMantenimientoRegulador,
  tanques_alquiler: filasTanqueCatalogo,
  reguladores_alquiler: filasReguladorCatalogo,
  compresores: filasCompresor,
  mantenimientos_compresores: filasMantenimientoCompresor,
};

function tituloEdicion(tabla) {
  if (tabla === "articulos") return "Código de catálogo editado";
  if (tabla === "tanques_alquiler") return "Tanque de catálogo editado";
  if (tabla === "reguladores_alquiler") return "Regulador de catálogo editado";
  if (tabla === "compresores") return "Compresor de catálogo editado";
  if (tabla === "mantenimientos_compresores") return "Mantenimiento de compresor editado";
  return `${tituloRegistro(tabla)} ${esMasculino(tabla) ? "editado" : "editada"}`;
}

function TarjetaEdicion({ cambio, esTitular }) {
  const d = cambio.datos_anteriores || {};
  const dn = cambio.datos_nuevos || null;

  // profiles es un caso especial: el "después" no viene de datos_nuevos
  // sino del propio nombre actual del perfil (cambio.full_name, que la
  // vista ya trae vía el join con profiles) -- por eso siempre tiene
  // Después aunque la edición sea de antes de esta entrega.
  if (cambio.tabla === "profiles") {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">Cambio de nombre</div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
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
            <tr>
              <td>Nombre</td>
              <td>{d.full_name}</td>
              <td>{cambio.full_name}</td>
            </tr>
            <tr>
              <td>Usuario</td>
              <td colSpan={2}>{cambio.full_name}</td>
            </tr>
            <tr>
              <td>Fecha</td>
              <td colSpan={2}>{formatFecha(cambio.created_at)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const armarFilas = FILAS_POR_TABLA[cambio.tabla];

  if (armarFilas) {
    return (
      <div className="card edicion">
        <div className="list-item-top">
          <div className="list-item-title">{tituloEdicion(cambio.tabla)}</div>
          {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
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
            {armarFilas(d, dn).map((f) => (
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
      </div>
    );
  }

  // Genérico -- por si algún día aparece una tabla nueva que aún no
  // tenga su propio detalle de filas arriba.
  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">
          {tituloRegistro(cambio.tabla)} {esMasculino(cambio.tabla) ? "editado" : "editada"}
        </div>
        {esTitular && <HistorialDeleteButton cambioId={cambio.id} />}
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
          <tr>
            <td>Contenido</td>
            <td>{contenido(cambio.tabla, d)}</td>
            <td>{dn ? contenido(cambio.tabla, dn) : "—"}</td>
          </tr>
          <tr>
            <td>Registrado originalmente por</td>
            <td colSpan={2}>{d.nombre_usuario_snapshot || "—"}</td>
          </tr>
          <tr>
            <td>Fecha de registro original</td>
            <td colSpan={2}>{d.created_at ? formatFecha(d.created_at) : "—"}</td>
          </tr>
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
  if (tabla === "pruebas_hidrostaticas") {
    return `${d.tanque_codigo_snapshot || "?"} · ${d.fecha_prueba ? formatMesAnio(d.fecha_prueba) : "?"} · ${
      d.resultado || "?"
    }`;
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
