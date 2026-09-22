"use client";

import { useState } from "react";
import { formatFecha } from "@/lib/format";

// "Mi actividad" en Mi Perfil: colapsado detrás de un botón por defecto
// para que la pantalla no se vea "regada" con hasta 20 tarjetas — se abre
// con un toque, mismo patrón de acordeón que Manual/Changelog.
export default function MiActividad({ actividad }) {
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
            actividad.map((a) =>
              a.tipo === "salida" ? (
                <div className="list-item" key={`salida-${a.id}`}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{a.folio}</span>
                      {a.articulo}
                      <span className="badge">{a.motivo}</span>
                    </span>
                    <span className="list-item-qty">{a.cantidad}</span>
                  </div>
                  <div className="list-item-meta">Salida · {formatFecha(a.created_at)}</div>
                </div>
              ) : (
                <div className="list-item" key={`llenado-${a.id}`}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{a.folio}</span>
                      Llenado de tanque
                      <span className="badge">{a.tipo_gas}</span>
                    </span>
                    <span className="list-item-qty">{a.cantidad} tanque(s)</span>
                  </div>
                  <div className="list-item-meta">Llenado · {formatFecha(a.created_at)}</div>
                </div>
              )
            )
          ) : (
            <div className="empty">Todavía no has registrado ninguna salida ni llenado.</div>
          )}
        </div>
      )}
    </div>
  );
}
