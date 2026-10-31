"use client";

import { useState } from "react";
import RegistroActions from "./RegistroActions";
import { formatFecha } from "@/lib/format";
import BuscadorLista from "./BuscadorLista";
import { IconPackage, IconTank, IconEye, IconGear } from "./icons";
import { detalleMantenimientoTexto, cambiosTexto } from "@/lib/mantenimiento-regulador";
import SolicitudRecibidaItem from "./SolicitudRecibidaItem";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "salida", label: "Salidas" },
  { valor: "llenado", label: "Llenados" },
  { valor: "inspeccion", label: "Inspecciones" },
  { valor: "mantenimiento", label: "Mantenimientos" },
  { valor: "solicitud", label: "Solicitudes" },
];

// Combina salidas, llenados de tanques, inspecciones visuales y
// mantenimientos de reguladores (ya mezclados y ordenados por fecha por
// el server component) en una sola lista, con un filtro por tipo — mismo
// estilo de tarjeta que Salidas/Tanques/Equipos.
export default function MovimientosList({ movimientos, puedeEditar }) {
  const [filtro, setFiltro] = useState("todos");
  // V52: al tocar un movimiento se abre su detalle ahí mismo ("31. bien").
  const [abierto, setAbierto] = useState(null);

  const filtrados =
    filtro === "todos" ? movimientos : movimientos.filter((m) => m.tipo === filtro);

  return (
    <div>
      <div className="period-toggle" style={{ marginBottom: 20, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            type="button"
            className={"period-btn" + (filtro === f.valor ? " period-btn-active" : "")}
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* V35: buscador (pedido explícito: "un search bar en los historiales, todos"). */}
      <BuscadorLista placeholder="Buscar código, tanque, regulador o persona...">
      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">No hay movimientos que mostrar.</div>
        ) : (
          filtrados.map((m) => {
            if (m.tipo === "salida") {
              return (
                <div className="list-item toca" data-buscar="" key={"salida-" + m.id} onClick={() => setAbierto(m)}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <IconPackage size={14} />
                      {m.articulo}
                      <span className="badge">{m.motivo}</span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.cantidad}</span>
                      {puedeEditar && (
                        <span onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}><RegistroActions
                          tabla="salidas"
                          registro={m}
                          editHref={`/salidas/${m.id}/editar`}
                        /></span>
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)}
                    {m.autorizado_por ? ` · Autorizó: ${m.autorizado_por}` : ""} <span className="folio-fin">· #{m.folio}</span>
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            // V50: lo que llegó por Solicitudes al almacén.
            if (m.tipo === "solicitud") {
              return <SolicitudRecibidaItem key={"solicitud-" + m.id} item={m} conIcono onClick={() => setAbierto(m)} />;
            }

            if (m.tipo === "llenado") {
              return (
                <div className="list-item toca" data-buscar="" key={"llenado-" + m.id} onClick={() => setAbierto(m)}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <IconTank size={14} />
                      Llenados de tanque
                      <span className={m.tipo_gas === "Nitrox" ? "badge badge-nitrox" : "badge"}>{m.tipo_gas}</span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.cantidad} tanque(s)</span>
                      {puedeEditar && (
                        <span onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}><RegistroActions
                          tabla="llenados_tanques"
                          registro={m}
                          editHref={`/tanques/${m.id}/editar`}
                        /></span>
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)} <span className="folio-fin">· #{m.folio}</span>
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            if (m.tipo === "inspeccion") {
              return (
                <div className="list-item toca" data-buscar="" key={"inspeccion-" + m.id} onClick={() => setAbierto(m)}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      {/* V52: un ojo para la inspección visual (nota: "pon un ojo, hace más sentido"). */}
                      <IconEye size={14} />
                      Inspección visual
                      <span className={m.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                        {m.resultado}
                      </span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.tanque_codigo_snapshot}</span>
                      {puedeEditar && (
                        <span onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}><RegistroActions
                          tabla="inspecciones_visuales"
                          registro={m}
                          editHref={`/equipos/inspeccion-visual/${m.id}/editar`}
                        /></span>
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)} <span className="folio-fin">· #{m.folio}</span>
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            // mantenimiento
            return (
              <div className="list-item toca" data-buscar="" key={"mantenimiento-" + m.id} onClick={() => setAbierto(m)}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <IconGear size={14} />
                    Mantenimiento de regulador
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{m.regulador_codigo_snapshot}</span>
                    {puedeEditar && (
                      <span onClick={(e) => e.stopPropagation()} style={{ display: "contents" }}><RegistroActions
                        tabla="mantenimientos_reguladores"
                        registro={m}
                        editHref={`/equipos/mantenimiento-reguladores/${m.id}/editar`}
                      /></span>
                    )}
                  </div>
                </div>
                <div className="list-item-meta">
                  {m.full_name} · {formatFecha(m.created_at)} <span className="folio-fin">· #{m.folio}</span>
                </div>
                <div className="list-item-meta">{detalleMantenimientoTexto(m)}</div>
                {cambiosTexto(m.componentes_cambios) && (
                  <div className="list-item-meta" style={{ color: "var(--verde)", fontWeight: 700 }}>
                    Cambió: {cambiosTexto(m.componentes_cambios)}
                  </div>
                )}
                {m.detalle && <div className="list-item-note">{m.detalle}</div>}
              </div>
            );
          })
        )}
      </div>
      </BuscadorLista>
      {abierto && <PanelMovimiento m={abierto} puedeEditar={puedeEditar} cerrar={() => setAbierto(null)} />}
    </div>
  );
}

// V52 -- El detalle de un movimiento, en un panel ahí mismo (sin salir de la
// lista, así no se pierde el filtro ni lo buscado), con botones para ir a lo
// relacionado (maqueta-v52.html, "Movimientos").
function Fila({ t, v }) {
  if (v === null || v === undefined || v === "") return null;
  return (
    <div className="mov-fila">
      <span>{t}</span>
      <b>{v}</b>
    </div>
  );
}

function PanelMovimiento({ m, puedeEditar, cerrar }) {
  let titulo = "";
  let filas = [];
  const botones = [];
  const cuando = formatFecha(m.created_at);
  if (m.tipo === "salida") {
    titulo = `Salida #${m.folio} · ${m.articulo}`;
    filas = [
      ["Cantidad", m.cantidad],
      ["Motivo", m.motivo],
      ["Quién", m.full_name],
      ["Cuándo", cuando],
      ["Autorizó", m.autorizado_por],
      ["Nota", m.nota],
    ];
    if (puedeEditar && m.articulo_id) botones.push({ href: `/catalogo/${m.articulo_id}/movimientos`, t: `Ver todos los movimientos de ${m.articulo}` });
    if (puedeEditar) botones.push({ href: `/salidas/${m.id}/editar`, t: "Editar" });
  } else if (m.tipo === "llenado") {
    titulo = `Llenado #${m.folio}`;
    filas = [
      ["Tanques", m.cantidad],
      ["Gas", m.tipo_gas || "Aire"],
      ["Facturado", m.facturado ? "Sí" : "No"],
      ["Quién", m.full_name],
      ["Cuándo", cuando],
      ["Nota", m.nota],
    ];
    botones.push({ href: "/tanques", t: "Ver los llenados" });
    if (puedeEditar) botones.push({ href: `/tanques/${m.id}/editar`, t: "Editar" });
  } else if (m.tipo === "inspeccion") {
    titulo = `Inspección visual #${m.folio} · ${m.tanque_codigo_snapshot || ""}`;
    filas = [
      ["Tanque", m.tanque_codigo_snapshot],
      ["Resultado", m.resultado],
      ["Quién", m.full_name],
      ["Cuándo", cuando],
      ["Nota", m.nota],
    ];
    if (m.tanque_id) botones.push({ href: `/catalogo/tanques/${m.tanque_id}`, t: `Ver el tanque ${m.tanque_codigo_snapshot || ""}` });
    if (puedeEditar) botones.push({ href: `/equipos/inspeccion-visual/${m.id}/editar`, t: "Editar" });
  } else if (m.tipo === "mantenimiento") {
    titulo = `Mantenimiento #${m.folio} · ${m.regulador_codigo_snapshot || ""}`;
    filas = [
      ["Regulador", m.regulador_codigo_snapshot],
      ["Trabajo", detalleMantenimientoTexto(m)],
      ["Cambió", cambiosTexto(m.componentes_cambios)],
      ["Quién", m.full_name],
      ["Cuándo", cuando],
      ["Nota", m.detalle],
    ];
    if (m.regulador_id) botones.push({ href: `/catalogo/reguladores/${m.regulador_id}`, t: `Ver el regulador ${m.regulador_codigo_snapshot || ""}` });
    if (puedeEditar) botones.push({ href: `/equipos/mantenimiento-reguladores/${m.id}/editar`, t: "Editar" });
  } else if (m.tipo === "solicitud") {
    const s = m.solicitud || {};
    titulo = `Solicitud #${s.folio ?? "?"} · ${m.codigo_snapshot}`;
    filas = [
      ["Cantidad", m.cantidad],
      ["Descripción", m.descripcion_snapshot],
      ["Pidió", s.nombre_usuario_snapshot ? `${s.nombre_usuario_snapshot}${s.created_at ? `, ${formatFecha(s.created_at)}` : ""}` : null],
      ["Recibió", `${m.recibido_por_nombre || "—"}, ${formatFecha(m.recibido_at)}`],
      ["Nota", s.nota],
    ];
    botones.push({ href: "/solicitudes?tab=recibidas", t: "Ver las solicitudes" });
  }
  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div className="modal-panel">
        <div className="modal-title">{titulo}</div>
        <div style={{ marginTop: 8 }}>
          {filas.map(([t, v]) => (
            <Fila key={t} t={t} v={v} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          {botones.map((b) => (
            <a key={b.href} href={b.href} className="btn secondary af-mini" style={{ textDecoration: "none" }}>
              {b.t}
            </a>
          ))}
          <button type="button" className="btn secondary af-mini" onClick={cerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
