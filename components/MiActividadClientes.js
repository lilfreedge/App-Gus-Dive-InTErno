"use client";

import { useState } from "react";
import { formatFecha } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// "Mi actividad" de App Clientes (23-sep-2026, pedido explícito: "agrega
// 'mi actividad' a 'mi perfil'") -- mismo patrón de acordeón que
// components/MiActividad.js (App Interno), pero con lo que este usuario
// ha registrado en App Clientes: órdenes, clientes y equipos nuevos.
// actividad: [{ id, tipo: "orden"|"cliente"|"equipo", created_at, ... }]
export default function MiActividadClientes({ actividad }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="btn secondary"
        style={{ width: "100%", justifyContent: "space-between", display: "flex" }}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>Ver mi actividad ({actividad.length})</span>
        <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="card" style={{ marginTop: 10 }}>
          {actividad.length > 0 ? (
            actividad.map((a) => {
              if (a.tipo === "orden") {
                return (
                  <div className="list-item" key={`orden-${a.id}`}>
                    <div className="list-item-top">
                      <span className="list-item-title">
                        <span className="folio-tag">#{a.folio}</span>
                        {a.cliente_nombre_snapshot} — {tipoEquipoLabel(a.tipo_equipo, a.tipo_equipo_otro)}
                      </span>
                    </div>
                    <div className="list-item-meta">Orden registrada · {formatFecha(a.created_at)}</div>
                  </div>
                );
              }
              if (a.tipo === "cliente") {
                return (
                  <div className="list-item" key={`cliente-${a.id}`}>
                    <div className="list-item-top">
                      <span className="list-item-title">{a.nombre}</span>
                    </div>
                    <div className="list-item-meta">Cliente agregado · {formatFecha(a.created_at)}</div>
                  </div>
                );
              }
              const marcaModelo = [a.marca, a.modelo].filter(Boolean).join(" ");
              return (
                <div className="list-item" key={`equipo-${a.id}`}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      {tipoEquipoLabel(a.tipo_equipo, a.tipo_equipo_otro)}
                      {marcaModelo && ` — ${marcaModelo}`}
                    </span>
                  </div>
                  <div className="list-item-meta">Equipo agregado · {formatFecha(a.created_at)}</div>
                </div>
              );
            })
          ) : (
            <div className="empty">Todavía no has registrado nada en App Equipos de clientes.</div>
          )}
        </div>
      )}
    </div>
  );
}
