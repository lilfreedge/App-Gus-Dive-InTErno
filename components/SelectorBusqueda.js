"use client";

import { useEffect, useRef, useState } from "react";

// Selector con búsqueda para listas medianas/largas (tanques, reguladores,
// etc.) — mismo patrón que app/salidas/ArticuloCombobox.js: un input de
// texto que filtra `items` por código/descripción y muestra un dropdown
// de coincidencias debajo. Solo permite elegir un item existente de la
// lista (no admite texto libre): si lo escrito no coincide con la
// selección actual, `valor` se limpia hasta que elijan de la lista.
//
// items: [{ id, codigo, descripcion }]
// valor: id seleccionado (o "")
// onChange: (id) => void
export default function SelectorBusqueda({ items, valor, onChange, placeholder, vacio }) {
  const seleccionado = items.find((i) => i.id === valor);
  const [texto, setTexto] = useState(seleccionado?.codigo || "");
  const [abierto, setAbierto] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Si cambia el item seleccionado desde afuera (p. ej. valor inicial ya
  // resuelto), sincroniza el texto mostrado.
  useEffect(() => {
    const actual = items.find((i) => i.id === valor);
    setTexto(actual?.codigo || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  if (!items || items.length === 0) {
    return <div className="hint-text">{vacio || "No hay opciones disponibles."}</div>;
  }

  const q = texto.trim().toLowerCase();
  const filtrados =
    q.length === 0
      ? items
      : items.filter(
          (i) =>
            i.codigo?.toLowerCase().includes(q) || i.descripcion?.toLowerCase().includes(q)
        );

  function elegir(item) {
    setTexto(item.codigo);
    onChange(item.id);
    setAbierto(false);
  }

  function onInputChange(v) {
    setTexto(v);
    setAbierto(true);
    const coincideExacto = items.find((i) => i.codigo?.toLowerCase() === v.trim().toLowerCase());
    onChange(coincideExacto ? coincideExacto.id : "");
  }

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        type="text"
        placeholder={placeholder || "Escribe para buscar por código..."}
        value={texto}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setAbierto(true)}
        autoComplete="off"
      />
      {abierto && filtrados.length > 0 && (
        <div className="autocomplete-list">
          {filtrados.map((i) => (
            <div key={i.id} onMouseDown={() => elegir(i)}>
              {i.codigo}
              {i.descripcion ? ` — ${i.descripcion}` : ""}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
