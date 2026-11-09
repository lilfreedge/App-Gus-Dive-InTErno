"use client";

import { useEffect, useRef, useState } from "react";

// V62 ("231" y "242"): el botón "⋯" de la página del buceo y del curso.
// Ahí van las cosas que se usan menos (cerrar inscripción, borrar…).
// opciones: [{ t: "Cerrar inscripción", d: "texto chico", onClick, peligro }]
export default function MenuMas({ opciones }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);
  const lista = (opciones || []).filter(Boolean);
  if (!lista.length) return null;
  return (
    <div className="vj-rep-wrap" ref={caja}>
      <button type="button" className="btn secondary vj-btn pg-mas" onClick={() => setAbierto((o) => !o)} aria-label="Más opciones">
        ⋯
      </button>
      {abierto && (
        <div className="vj-rep-menu pg-mas-menu">
          {lista.map((o, i) => (
            <button
              key={i}
              type="button"
              className={o.peligro ? "pg-peligro" : ""}
              onClick={() => {
                setAbierto(false);
                o.onClick();
              }}
            >
              <b>{o.t}</b>
              {o.d && <span>{o.d}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
