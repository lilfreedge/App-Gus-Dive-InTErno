"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const SORTS = [
  { clave: "nombre_asc", label: "Nombre (A-Z)" },
  { clave: "nombre_desc", label: "Nombre (Z-A)" },
  { clave: "reciente", label: "Más reciente primero" },
];

export default function ClientesClient({ clientes }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("nombre_asc");

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    let base = !query
      ? clientes
      : clientes.filter(
          (c) => c.nombre?.toLowerCase().includes(query) || c.telefono?.toLowerCase().includes(query)
        );
    base = [...base].sort((a, b) => {
      if (sort === "nombre_desc") return (b.nombre || "").localeCompare(a.nombre || "");
      if (sort === "reciente") return (b.created_at || "").localeCompare(a.created_at || "");
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
    return base;
  }, [clientes, q, sort]);

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre o teléfono..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      <label htmlFor="sort_clientes" style={{ marginTop: 0 }}>Ordenar por</label>
      <select id="sort_clientes" value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginBottom: 14 }}>
        {SORTS.map((s) => (
          <option key={s.clave} value={s.clave}>{s.label}</option>
        ))}
      </select>
      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">
            {clientes.length === 0 ? "Todavía no hay clientes registrados." : "Ningún cliente coincide con esa búsqueda."}
          </div>
        ) : (
          filtrados.map((c) => (
            <Link
              key={c.id}
              href={`/app-clientes/clientes/${c.id}`}
              className="list-item"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className="list-item-top">
                <span className="list-item-title">{c.nombre}</span>
              </div>
              {c.telefono && <div className="list-item-meta">{c.telefono}</div>}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
