"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function ClientesClient({ clientes }) {
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return clientes;
    return clientes.filter(
      (c) => c.nombre?.toLowerCase().includes(query) || c.telefono?.toLowerCase().includes(query)
    );
  }, [clientes, q]);

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre o teléfono..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
      />
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
