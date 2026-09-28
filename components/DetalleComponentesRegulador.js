"use client";

import { REGULADOR_DETALLE_CAMPOS } from "@/lib/regulador-detalle";

// Detalle de componentes de un Regulador (28-sep-2026, pedido explícito).
// Compartido por los 3 lugares donde se crea/edita un equipo Regulador
// (SelectorEquipoCliente.js, clientes/[id]/equipos/nuevo, equipos/[id]/
// editar) para que no se desincronicen los campos ni las etiquetas.
//
// detalle: { primera, segunda, octopus, manometro, manguera_bc } (todos
// opcionales, ver lib/regulador-detalle.js). onChange(detalleNuevo).
export default function DetalleComponentesRegulador({ detalle, onChange, idPrefix = "detalle" }) {
  const d = detalle || {};

  function set(campo, valor) {
    onChange({ ...d, [campo]: valor });
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--superficie-suave)", borderRadius: 8 }}>
      <div className="section-title" style={{ marginTop: 0, fontSize: 12 }}>
        Detalle de componentes
      </div>
      {REGULADOR_DETALLE_CAMPOS.map((c) => (
        <div key={c.id}>
          <label htmlFor={`${idPrefix}_${c.id}`}>{c.label}</label>
          <input
            id={`${idPrefix}_${c.id}`}
            type="text"
            value={d[c.id] || ""}
            onChange={(e) => set(c.id, e.target.value)}
            placeholder="Opcional"
          />
        </div>
      ))}
      <label style={{ marginTop: 10 }}>Manguera de BC</label>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          className={d.manguera_bc === true ? "btn btn-primary" : "btn secondary"}
          onClick={() => set("manguera_bc", true)}
          style={{ marginTop: 0, width: "auto" }}
        >
          Sí
        </button>
        <button
          type="button"
          className={d.manguera_bc === false ? "btn btn-primary" : "btn secondary"}
          onClick={() => set("manguera_bc", false)}
          style={{ marginTop: 0, width: "auto" }}
        >
          No
        </button>
      </div>
    </div>
  );
}
