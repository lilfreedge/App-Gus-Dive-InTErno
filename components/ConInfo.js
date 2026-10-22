"use client";

import { useState } from "react";

// V32 -- Botón ⓘ (pedido explícito: "¿dónde más podemos agregar este icono
// ⓘ? ... ok agrégalos"). Los textos que explican CÓMO FUNCIONA algo se
// esconden detrás de este botón, pegado al título o a la etiqueta; al
// tocarlo se abre debajo y al tocarlo otra vez se cierra. Los avisos y los
// datos importantes NO van aquí: se quedan a la vista.
//
// Uso: <ConInfo texto="...">{título o etiqueta}</ConInfo>
// `texto` puede ser un string o JSX.
export default function ConInfo({ texto, children, style, filaStyle, abiertoInicial = false }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <div style={style}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, ...filaStyle }}>
        {children}
        <button
          type="button"
          className={`hint-toggle-btn info-btn${abierto ? " info-btn-abierto" : ""}`}
          onClick={() => setAbierto((v) => !v)}
          aria-label={abierto ? "Ocultar explicación" : "Ver explicación"}
          aria-expanded={abierto}
          title="Ver explicación"
        >
          i
        </button>
      </div>
      {abierto && <div className="info-box">{texto}</div>}
    </div>
  );
}
