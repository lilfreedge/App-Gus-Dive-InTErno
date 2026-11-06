"use client";

import { useEffect } from "react";
import { PREGUNTA_DE, tieneComponente } from "@/lib/regulador-detalle";

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

  // V61 (nota del 3-nov): el orden es 1ra etapa; Manguera 2da (baja) > 2da
  // etapa; Manguera de Octopus (baja) > Octopus; Manguera de BC; Manguera de
  // alta > Manómetro; Profundímetro (Sí/No > marca); Brújula (Sí/No). El
  // campo de texto solo sale cuando se contesta "Sí".
  const siNo = (campo, valor) => (
    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
      {[
        [true, "Sí"],
        [false, "No"],
      ].map(([v, t]) => (
        <button
          key={t}
          type="button"
          className={valor === v ? "btn btn-primary" : "btn secondary"}
          onClick={() => set(campo, v)}
          style={{ marginTop: 0, width: "auto" }}
        >
          {t}
        </button>
      ))}
    </div>
  );
  const conTexto = (id, etiquetaTexto) => {
    const q = PREGUNTA_DE[id];
    const tiene = tieneComponente(d, id);
    return (
      <div key={id} className="reg-pregunta">
        <label style={{ marginTop: 10 }}>{q.label}</label>
        {siNo(q.flag, tiene)}
        {tiene === true && (
          <>
            <label htmlFor={`${idPrefix}_${id}`}>{etiquetaTexto}</label>
            <input id={`${idPrefix}_${id}`} type="text" value={d[id] || ""} onChange={(e) => set(id, e.target.value)} placeholder="Marca / modelo (opcional)" />
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 10, padding: 12, background: "var(--superficie-suave)", borderRadius: 8 }}>
      <div className="section-title" style={{ marginTop: 0, fontSize: 12 }}>
        Detalle de componentes
      </div>
      <label htmlFor={`${idPrefix}_primera`}>1ra etapa</label>
      <input id={`${idPrefix}_primera`} type="text" value={d.primera || ""} onChange={(e) => set("primera", e.target.value)} placeholder="Opcional" />
      {conTexto("segunda", "2da etapa")}
      {conTexto("octopus", "Octopus")}
      <label style={{ marginTop: 10 }}>Manguera de BC</label>
      {siNo("manguera_bc", d.manguera_bc)}
      {conTexto("manometro", "Manómetro")}
      {conTexto("profundimetro", "¿Cuál profundímetro?")}
      <label style={{ marginTop: 10 }}>Brújula</label>
      {siNo("brujula", d.brujula)}
    </div>
  );
}
