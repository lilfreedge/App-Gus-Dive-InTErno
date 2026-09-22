"use client";

import { useState } from "react";

// Envoltura genérica para esconder una sección detrás de un botón --
// mismo patrón de acordeón que "Mi actividad" en Mi Perfil y
// "Apariencia" (ver MiActividad.js / PreferenciasApariencia.js).
// Se usa en Administración para que la pantalla no se vea toda regada
// con tarjetas una debajo de otra: cada sección queda oculta hasta que
// el Titular la abre con un toque.
export default function SeccionColapsable({ titulo, children, abiertoInicial = false, danger = false }) {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <div style={{ marginTop: 14 }}>
      <button
        type="button"
        className="btn secondary"
        style={{
          width: "100%",
          justifyContent: "space-between",
          display: "flex",
          color: danger ? "var(--rojo)" : undefined,
          borderColor: danger ? "var(--rojo)" : undefined,
        }}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>{titulo}</span>
        <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="card" style={{ marginTop: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}
