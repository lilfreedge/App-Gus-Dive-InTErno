"use client";

import { useMemo, useState } from "react";

// Recibe topics = [{key, title, body, searchText}] ya filtrados por
// permisos/rol en page.js (server component) — acá solo se maneja la
// interactividad: buscador y acordeón. Todos los temas empiezan
// colapsados. Al buscar, se filtran por título + searchText (resumen en
// texto plano de cada tema) y los que coinciden se auto-expanden.
export default function ManualClient({ topics }) {
  const [busqueda, setBusqueda] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set());

  const q = busqueda.trim().toLowerCase();
  const buscando = q.length > 0;

  const visibles = useMemo(() => {
    if (!buscando) return topics;
    return topics.filter((t) => {
      const haystack = `${t.title} ${t.searchText || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [topics, q, buscando]);

  function toggle(key) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function onBusquedaChange(valor) {
    setBusqueda(valor);
    if (!valor.trim()) {
      setAbiertos(new Set());
    }
  }

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar en el manual..."
        />
      </div>

      {visibles.length === 0 ? (
        <div className="empty">No se encontraron resultados.</div>
      ) : (
        visibles.map((t) => {
          const abierto = buscando || abiertos.has(t.key);
          return (
            <div className="manual-topic" key={t.key}>
              <button
                type="button"
                className="manual-topic-header"
                onClick={() => toggle(t.key)}
                aria-expanded={abierto}
              >
                <span>{t.title}</span>
                <span className={`manual-chevron${abierto ? " manual-chevron-open" : ""}`}>
                  ▾
                </span>
              </button>
              {abierto && <div className="manual-topic-body">{t.body}</div>}
            </div>
          );
        })
      )}
    </div>
  );
}
