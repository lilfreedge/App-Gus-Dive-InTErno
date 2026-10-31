"use client";

import { COMPONENTES_ALQUILER, TEXTO_COMPONENTES } from "@/lib/mantenimiento-regulador";

// V50 -- Componentes del regulador al registrar su mantenimiento
// (maqueta-v50-notas.html, sección 4). Salen como están guardados; "Cambió"
// abre un campo para escribir el nuevo y "No cambió" lo deja como estaba.
// `nuevos`: { [campo]: texto } solo de los que se tocaron como "Cambió".
// `grande`: la pantalla del técnico (letra y botones más grandes).
export default function ComponentesRegulador({ regulador, nuevos, setNuevos, grande = false }) {
  if (!regulador) return null;
  const editando = (campo) => Object.prototype.hasOwnProperty.call(nuevos, campo);
  const cambiar = (campo) => setNuevos({ ...nuevos, [campo]: "" });
  const noCambio = (campo) => {
    const x = { ...nuevos };
    delete x[campo];
    setNuevos(x);
  };

  return (
    <div style={grande ? { fontSize: 15.5 } : null}>
      <div className={grande ? "tec-hint" : "hint-text"} style={{ margin: "0 0 4px" }}>
        {TEXTO_COMPONENTES}
      </div>
      {COMPONENTES_ALQUILER.map((c) => {
        const antes = String(regulador[c.campo] ?? "").trim();
        return editando(c.campo) ? (
          <div key={c.campo} className="comp-fila cambio">
            <span className="comp-fila-l">{c.etiqueta}</span>
            <span>
              <span className="comp-antes">{antes || "—"}</span>
              <input
                type="text"
                className={grande ? "tec-input" : undefined}
                value={nuevos[c.campo]}
                onChange={(e) => setNuevos({ ...nuevos, [c.campo]: e.target.value })}
                placeholder={`Nuevo: ${c.etiqueta.toLowerCase()}`}
                autoFocus
              />
            </span>
            <button type="button" className="comp-btn" onClick={() => noCambio(c.campo)}>
              No cambió
            </button>
          </div>
        ) : (
          <div key={c.campo} className="comp-fila">
            <span className="comp-fila-l">{c.etiqueta}</span>
            <span>{antes || "—"}</span>
            <button type="button" className="comp-btn" onClick={() => cambiar(c.campo)}>
              Cambió
            </button>
          </div>
        );
      })}
    </div>
  );
}
