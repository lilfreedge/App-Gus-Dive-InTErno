"use client";

import { useEffect, useRef, useState } from "react";

// Combobox con autocompletado contra el catálogo activo. Solo permite
// seleccionar un artículo que exista en el catálogo (no admite texto libre):
// si el usuario escribe algo que no coincide con ninguna selección válida,
// `articuloId` se queda vacío y el formulario que lo usa debe bloquear el
// envío mostrando el error correspondiente.
export default function ArticuloCombobox({ articulos, articuloId, onChange, hasError }) {
  const seleccionado = articulos.find((a) => a.id === articuloId);
  const [texto, setTexto] = useState(seleccionado?.nombre || "");
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtrados =
    texto.trim().length === 0
      ? articulos
      : articulos.filter((a) => a.nombre.toLowerCase().includes(texto.trim().toLowerCase()));

  function elegir(a) {
    setTexto(a.nombre);
    onChange(a.id);
    setAbierto(false);
  }

  function onInputChange(v) {
    setTexto(v);
    setAbierto(true);
    // Si lo que hay escrito ya no coincide exactamente con el artículo
    // seleccionado, se invalida la selección hasta que elijan de la lista.
    const coincideExacto = articulos.find(
      (a) => a.nombre.toLowerCase() === v.trim().toLowerCase()
    );
    onChange(coincideExacto ? coincideExacto.id : "");
  }

  return (
    <div className={"autocomplete-wrap" + (hasError ? " field-error" : "")} ref={wrapRef}>
      <input
        type="text"
        placeholder="Escribe para buscar por código o nombre..."
        value={texto}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setAbierto(true)}
        autoComplete="off"
      />
      {abierto && filtrados.length > 0 && (
        <div className="autocomplete-list">
          {filtrados.map((a) => (
            <div key={a.id} onMouseDown={() => elegir(a)}>
              {a.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
