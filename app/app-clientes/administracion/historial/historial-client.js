"use client";

import Link from "next/link";
import { useState } from "react";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import BorrarTodoHistorialButton from "@/components/BorrarTodoHistorialButton";
import { formatFecha } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { filasOrden, filasCliente } from "@/lib/historial-ordenes";
import { detalleComponentesTexto } from "@/lib/regulador-detalle";

// Pestañas por categoría (item 21, feedback sobre v40, pedido explícito:
// "reorganiza historial en botones por categoria, ejemplo ordenes,
// equipos, clientes, anulados") -- antes eran 2 listas largas y
// mezcladas ("Movimientos anulados" y "Ediciones", cada una con órdenes/
// equipos/clientes todos juntos). "Anulados" se deja como una sola
// pestaña con las 3 tablas juntas (igual que antes) -- son pocos y no
// hacía falta partirlos también; lo que sí se pidió separar fueron las
// ediciones, que eran la lista larga y mezclada de verdad.
const TABS = [
  { clave: "ordenes", label: "Órdenes" },
  { clave: "equipos", label: "Equipos" },
  { clave: "clientes", label: "Clientes" },
  { clave: "anulados", label: "Anulados" },
];

export default function HistorialClient({ ordenId, cambios, esTitular = false }) {
  const [tab, setTab] = useState("ordenes");

  // Vista filtrada de una sola orden (desde "Ver historial de ediciones
  // de esta orden" en la ficha) -- se queda igual que antes, sin
  // pestañas: ya viene acotada a una sola orden, no hace falta elegir
  // categoría.
  if (ordenId) {
    const ediciones = cambios.filter((c) => c.accion === "editar");
    return (
      <div>
        <div className="section-title" style={{ marginTop: 0 }}>Ediciones</div>
        {ediciones.length > 0 ? (
          ediciones.map((c) => <TarjetaEdicion key={c.id} cambio={c} />)
        ) : (
          <div className="empty">Esta orden todavía no tiene ediciones registradas.</div>
        )}
      </div>
    );
  }

  const porCategoria = {
    ordenes: cambios.filter((c) => c.tabla === "ordenes_equipos" && c.accion === "editar"),
    equipos: cambios.filter((c) => c.tabla === "equipos_del_cliente" && c.accion === "editar"),
    clientes: cambios.filter((c) => c.tabla === "clientes_equipos" && c.accion === "editar"),
    anulados: cambios.filter((c) => c.accion === "borrar"),
  };
  const activos = porCategoria[tab];

  return (
    <div>
      {/* Borrar todo el historial (28-sep-2026, pedido explícito: "ponme un
          boton para borrar aqui también, acceso para mi nada mas") -- solo
          Titular, cubre las 4 categorías (Órdenes/Equipos/Clientes/Anulados
          comparten la misma tabla cambios_historial, acotada a estas 3
          `tabla` -- igual que la consulta del servidor en page.js). */}
      {esTitular && (
        <div style={{ marginBottom: 14 }}>
          <BorrarTodoHistorialButton
            filtro={{ tabla: ["ordenes_equipos", "equipos_del_cliente", "clientes_equipos"] }}
            etiqueta="todo el historial (Órdenes, Equipos, Clientes y Anulados)"
          />
        </div>
      )}
      <div className="period-toggle" style={{ marginBottom: 14, flexWrap: "wrap", rowGap: 8 }}>
        {TABS.map((t) => (
          <button
            key={t.clave}
            type="button"
            className={`period-btn ${tab === t.clave ? "period-btn-active" : ""}`}
            onClick={() => setTab(t.clave)}
            style={{ flex: "1 1 22%" }}
          >
            {t.label} ({porCategoria[t.clave].length})
          </button>
        ))}
      </div>

      {activos.length > 0 ? (
        activos.map((c) => (tab === "anulados" ? <TarjetaAnulado key={c.id} cambio={c} /> : <TarjetaEdicion key={c.id} cambio={c} />))
      ) : (
        <div className="empty">
          {tab === "anulados" ? "No hay movimientos anulados." : "Todavía no hay ediciones registradas en esta categoría."}
        </div>
      )}
    </div>
  );
}

function tituloTabla(tabla) {
  if (tabla === "equipos_del_cliente") return "Equipo";
  if (tabla === "clientes_equipos") return "Cliente";
  return "Orden";
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
// vive en lib/historial-ordenes.js (27-sep-2026) -- se reutiliza también
// en "Bitácora movimientos en órdenes". `dn` (datos_nuevos) puede venir
// vacío en ediciones de antes de migration_29.sql.
function filasEquipo(d, dn) {
  const tipo = dn?.tipo_equipo || d.tipo_equipo;
  const filas = [
    {
      label: "Tipo de equipo",
      antes: tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "—",
      despues: dn ? tipoEquipoLabel(dn.tipo_equipo, dn.tipo_equipo_otro) || "—" : "—",
    },
    { label: tipo === "Tanques" ? "Fabricante" : "Marca", antes: d.marca || "—", despues: dn?.marca || "—" },
    { label: "Modelo", antes: d.modelo || "—", despues: dn?.modelo || "—" },
    { label: "No. Serie", antes: d.serie || "—", despues: dn?.serie || "—" },
  ];
  // Detalle de componentes -- solo Reguladores (28-sep-2026, pedido
  // explícito: "que esto quede registrado en el historial del cliente").
  // Sin esto, una edición que solo cambia el detalle del regulador se veía
  // como un diff vacío (las 4 filas de arriba salen idénticas).
  if (tipo === "Reguladores") {
    filas.push({
      label: "Detalle de componentes",
      antes: detalleComponentesTexto(d.regulador_componentes_detalle),
      despues: dn ? detalleComponentesTexto(dn.regulador_componentes_detalle) : "—",
    });
  }
  return filas;
}

// Detalle colapsado por default (28-sep-2026, pedido explícito: mismo
// pedido que ya se había hecho para Bitácora -- "pon las ediciones que
// figuren en la bitacora que esten en un boton" -- se replica aquí:
// "y pon as ediciones recogidas en boton, que solamente se vea 'orden tal
// editada' y la fecha y hora de la edicion"). Arranca cerrada, "Editado
// por"/"Fecha de edición" salen de la tabla y se dejan siempre visibles
// como en Bitácora (TarjetaBitacoraMovimiento.js), mismo patrón de
// acordeón. Las filas donde antes == después se dejan sin resaltar; las
// que sí cambiaron se marcan con .cambio-resaltado (pedido explícito,
// mismo día: "que dentro de cada ficha se vea resaltado el cambio
// realizado, hoy en dia se ven todos los datos iguales").
function TarjetaEdicion({ cambio }) {
  const [abierto, setAbierto] = useState(false);
  const d = cambio.datos_anteriores || {};
  const dn = cambio.datos_nuevos || null;
  const esOrden = cambio.tabla === "ordenes_equipos";
  const esCliente = cambio.tabla === "clientes_equipos";
  const filas = esOrden ? filasOrden(d, dn) : esCliente ? filasCliente(d, dn) : filasEquipo(d, dn);
  const titulo = esOrden
    ? `Orden No. ${d.no_orden_fisico ?? d.folio ?? "?"} editada`
    : esCliente
      ? `Cliente ${dn?.nombre || d.nombre || ""} editado`
      : `${tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "Equipo"} editado`;

  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">{titulo}</div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <div className="hint-text" style={{ marginTop: 2 }}>
        {cambio.full_name} · {formatFecha(cambio.created_at)}
      </div>

      <button
        type="button"
        className="btn secondary"
        style={{ width: "100%", justifyContent: "space-between", display: "flex", marginTop: 10 }}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>{abierto ? "Ocultar cambios" : "Ver cambios"}</span>
        <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>

      {abierto && (
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
              <tr key={f.label} className={f.antes !== f.despues ? "cambio-resaltado" : ""}>
                <td>{f.label}</td>
                <td>{f.antes}</td>
                <td>{f.despues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link
        href={
          esOrden
            ? `/app-clientes/ordenes/${cambio.registro_id}`
            : esCliente
              ? `/app-clientes/clientes/${cambio.registro_id}`
              : `/app-clientes/equipos/${cambio.registro_id}`
        }
        style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
      >
        {esOrden ? "Ver orden actual →" : esCliente ? "Ver cliente actual →" : "Ver equipo actual →"}
      </Link>
    </div>
  );
}
