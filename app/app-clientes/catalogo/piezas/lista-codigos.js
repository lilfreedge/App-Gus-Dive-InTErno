"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

// V114 (pedido explícito, con foto de Base de datos › Códigos a cobrar:
// "agrégame un search bar ahí") -- busca por código o por descripción, sin
// importar mayúsculas, tildes ni espacios de más. Misma lista que antes
// (código en gris antes de la descripción, "Inactivo", link a Editar si
// tiene el permiso).
function normal(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default function ListaCodigos({ piezas, puedeEditar }) {
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const query = normal(q);
    if (!query) return piezas;
    const sinEspacios = query.replace(/[\s-]/g, "");
    return piezas.filter((p) => {
      const codigo = normal(p.codigo);
      return (
        codigo.includes(query) ||
        codigo.replace(/[\s-]/g, "").includes(sinEspacios) ||
        normal(p.nombre).includes(query)
      );
    });
  }, [piezas, q]);

  return (
    <div>
      <input
        type="search"
        placeholder="Buscar por código o descripción..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
        aria-label="Buscar código"
      />

      <div className="card">
        {piezas.length === 0 ? (
          <div className="empty">Todavía no hay códigos en el catálogo.</div>
        ) : filtrados.length === 0 ? (
          <div className="empty">Ningún código coincide con esa búsqueda.</div>
        ) : (
          filtrados.map((p) => {
            // Código antes que la descripción (28-sep-2026, feedback en
            // vivo, item 1: "Poner que el codigo salga antes que el
            // nombre") -- códigos viejos, guardados antes de que el campo
            // fuera obligatorio, pueden no tener uno; ahí solo se ve la
            // descripción.
            const fila = (
              <div>
                <div className="list-item-top">
                  <span className="list-item-title">
                    {p.codigo && <span style={{ color: "var(--texto-suave)", fontWeight: 400 }}>{p.codigo} · </span>}
                    {p.nombre}
                  </span>
                  {!p.activo && <span className="badge">Inactivo</span>}
                </div>
              </div>
            );
            return puedeEditar ? (
              <Link
                key={p.id}
                href={`/app-clientes/catalogo/piezas/${p.id}/editar`}
                className="list-item"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                {fila}
              </Link>
            ) : (
              <div key={p.id} className="list-item">
                {fila}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
