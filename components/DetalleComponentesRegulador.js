"use client";

import { useEffect } from "react";
import { REGULADOR_DETALLE_CAMPOS } from "@/lib/regulador-detalle";

// Detalle de componentes de un Regulador (28-sep-2026, pedido explícito).
// Compartido por los 3 lugares donde se crea/edita un equipo Regulador
// (SelectorEquipoCliente.js, clientes/[id]/equipos/nuevo, equipos/[id]/
// editar) para que no se desincronicen los campos ni las etiquetas.
//
// detalle: { primera, segunda, octopus, manometro, manguera_bc } (todos
// opcionales, ver lib/regulador-detalle.js). onChange(detalleNuevo).
//
// marca/modelo (28-sep-2026, pedido explícito: "agrega que en la 1ra
// etapa se ponga por default la marca y modelo del regulador") -- el
// regulador en sí normalmente ES la 1ra etapa, así que ese campo se
// prellena solo con "Marca Modelo" mientras siga vacío -- totalmente
// editable después, mismo espíritu que las fechas del Seguimiento con la
// fecha de hoy por default. En cuanto "1ra etapa" tiene algo escrito
// (aunque sea a mano), deja de seguir los cambios de Marca/Modelo.
export default function DetalleComponentesRegulador({ detalle, onChange, idPrefix = "detalle", marca = "", modelo = "" }) {
  const d = detalle || {};

  useEffect(() => {
    if (d.primera) return;
    const marcaModelo = [marca, modelo].map((v) => (v || "").trim()).filter(Boolean).join(" ");
    if (!marcaModelo) return;
    onChange({ ...d, primera: marcaModelo });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, modelo]);

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
