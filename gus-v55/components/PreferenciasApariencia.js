"use client";

import { useEffect, useState } from "react";
import { IconMinus, IconPlus } from "./icons";

// Preferencias visuales por dispositivo (modo oscuro y tamaño de letra).
// Se guardan en localStorage del navegador -- no en Supabase, porque son
// una preferencia del aparato, no del usuario. Se aplican de inmediato a
// toda la app vía atributos en <html> (ver app/layout.js para el script
// que las aplica antes del primer paint, y app/globals.css para las reglas
// de [data-theme="dark"] y [data-tamano-letra]).
const TAMANOS_LETRA = [
  { key: "muy-chica", label: "Muy pequeño" },
  { key: "chica", label: "Pequeño" },
  { key: "normal", label: "Normal" },
  { key: "grande", label: "Grande" },
  { key: "muy-grande", label: "Muy grande" },
];

function leerLocalStorage(clave, porDefecto) {
  if (typeof window === "undefined") return porDefecto;
  try {
    return localStorage.getItem(clave) || porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

export default function PreferenciasApariencia() {
  const [abierto, setAbierto] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(false);
  const [tamanoLetra, setTamanoLetra] = useState("normal");

  // Lee el estado real (aplicado por el script del layout) recién montado
  // en el cliente, para que los controles arranquen sincronizados.
  useEffect(() => {
    setModoOscuro(leerLocalStorage("gus-tema", "light") === "dark");
    setTamanoLetra(leerLocalStorage("gus-tamano-letra", "normal"));
  }, []);

  function toggleModoOscuro(activo) {
    setModoOscuro(activo);
    document.documentElement.setAttribute("data-theme", activo ? "dark" : "light");
    try {
      localStorage.setItem("gus-tema", activo ? "dark" : "light");
    } catch (e) {}
  }

  function irAPaso(delta) {
    const idx = TAMANOS_LETRA.findIndex((t) => t.key === tamanoLetra);
    const nuevoIdx = Math.min(TAMANOS_LETRA.length - 1, Math.max(0, idx + delta));
    const nuevo = TAMANOS_LETRA[nuevoIdx].key;
    setTamanoLetra(nuevo);
    document.documentElement.setAttribute("data-tamano-letra", nuevo);
    try {
      localStorage.setItem("gus-tamano-letra", nuevo);
    } catch (e) {}
  }

  const idx = TAMANOS_LETRA.findIndex((t) => t.key === tamanoLetra);

  // Colapsado detrás de un botón por defecto, mismo patrón de acordeón
  // que "Mi actividad" (MiActividad.js) y Manual/Changelog.
  return (
    <div>
      <button
        type="button"
        className="btn secondary"
        style={{ width: "100%", justifyContent: "space-between", display: "flex" }}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>Apariencia</span>
        <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </span>
      </button>

      {abierto && (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="switch-row" style={{ marginTop: 0 }}>
            <span className="switch-label">Modo oscuro</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={modoOscuro}
                onChange={(e) => toggleModoOscuro(e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
          <p className="hint-text" style={{ marginBottom: 16 }}>
            Aplica a toda la app en este dispositivo.
          </p>

          <div className="switch-label" style={{ marginBottom: 10 }}>
            Tamaño de letra
          </div>
          <div className="letra-stepper">
            <button
              type="button"
              className="letra-stepper-btn"
              onClick={() => irAPaso(-1)}
              aria-label="Achicar letra"
              disabled={idx <= 0}
            >
              <IconMinus size={16} />
            </button>
            <span className="letra-stepper-label">{TAMANOS_LETRA[idx]?.label || "Normal"}</span>
            <button
              type="button"
              className="letra-stepper-btn"
              onClick={() => irAPaso(1)}
              aria-label="Agrandar letra"
              disabled={idx >= TAMANOS_LETRA.length - 1}
            >
              <IconPlus size={16} />
            </button>
          </div>
          <div className="letra-stepper-dots">
            {TAMANOS_LETRA.map((t, i) => (
              <span
                key={t.key}
                className={"letra-stepper-dot" + (i === idx ? " letra-stepper-dot-activo" : "")}
              />
            ))}
          </div>
          <p className="hint-text">Agranda o achica el texto y los botones de toda la app.</p>
        </div>
      )}
    </div>
  );
}
