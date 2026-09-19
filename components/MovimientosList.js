"use client";

import { useState } from "react";
import RegistroActions from "./RegistroActions";
import { formatFecha } from "@/lib/format";
import { IconPackage, IconTank, IconAlert, IconGear } from "./icons";

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "salida", label: "Salidas" },
  { valor: "llenado", label: "Llenados" },
  { valor: "inspeccion", label: "Inspecciones" },
  { valor: "mantenimiento", label: "Mantenimientos" },
];

// Combina salidas, llenados de tanques, inspecciones visuales y
// mantenimientos de reguladores (ya mezclados y ordenados por fecha por
// el server component) en una sola lista, con un filtro por tipo — mismo
// estilo de tarjeta que Salidas/Tanques/Equipos.
export default function MovimientosList({ movimientos, puedeEditar }) {
  const [filtro, setFiltro] = useState("todos");

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

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">No hay movimientos que mostrar.</div>
        ) : (
          filtrados.map((m) => {
            if (m.tipo === "salida") {
              return (
                <div className="list-item" key={"salida-" + m.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <IconPackage size={14} />
                      <span className="folio-tag">#{m.folio}</span>
                      {m.articulo}
                      <span className="badge">{m.motivo}</span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.cantidad}</span>
                      {puedeEditar && (
                        <RegistroActions
                          tabla="salidas"
                          registro={m}
                          editHref={`/salidas/${m.id}/editar`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)}
                    {m.autorizado_por ? ` · Autorizó: ${m.autorizado_por}` : ""}
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            if (m.tipo === "llenado") {
              return (
                <div className="list-item" key={"llenado-" + m.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <IconTank size={14} />
                      <span className="folio-tag">#{m.folio}</span>
                      Llenados de tanque
                      <span className="badge">{m.tipo_gas}</span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.cantidad} tanque(s)</span>
                      {puedeEditar && (
                        <RegistroActions
                          tabla="llenados_tanques"
                          registro={m}
                          editHref={`/tanques/${m.id}/editar`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)}
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            if (m.tipo === "inspeccion") {
              return (
                <div className="list-item" key={"inspeccion-" + m.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <IconAlert size={14} />
                      <span className="folio-tag">#{m.folio}</span>
                      Inspección visual
                      <span className={m.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                        {m.resultado}
                      </span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{m.tanque_codigo_snapshot}</span>
                      {puedeEditar && (
                        <RegistroActions
                          tabla="inspecciones_visuales"
                          registro={m}
                          editHref={`/equipos/inspeccion-visual/${m.id}/editar`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    {m.full_name} · {formatFecha(m.created_at)}
                  </div>
                  {m.nota && <div className="list-item-note">{m.nota}</div>}
                </div>
              );
            }

            // mantenimiento
            return (
              <div className="list-item" key={"mantenimiento-" + m.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <IconGear size={14} />
                    <span className="folio-tag">#{m.folio}</span>
                    Mantenimiento de regulador
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="list-item-qty">{m.regulador_codigo_snapshot}</span>
                    {puedeEditar && (
                      <RegistroActions
                        tabla="mantenimientos_reguladores"
                        registro={m}
                        editHref={`/equipos/mantenimiento-reguladores/${m.id}/editar`}
                      />
                    )}
                  </div>
                </div>
                <div className="list-item-meta">
                  {m.full_name} · {formatFecha(m.created_at)}
                </div>
                {m.detalle && <div className="list-item-note">{m.detalle}</div>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
