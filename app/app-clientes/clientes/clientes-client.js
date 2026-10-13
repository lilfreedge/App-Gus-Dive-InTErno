"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const SORTS = [
  { clave: "nombre_asc", label: "Nombre (A-Z)" },
  { clave: "nombre_desc", label: "Nombre (Z-A)" },
  { clave: "reciente", label: "Más reciente primero" },
];

export default function ClientesClient({ clientes: clientesIniciales, puedeEliminar }) {
  const supabase = createClient();
  const [clientes, setClientes] = useState(clientesIniciales);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("nombre_asc");
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [borrando, setBorrando] = useState(false);
  const [errorBorrar, setErrorBorrar] = useState("");

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    let base = !query
      ? clientes
      : clientes.filter(
          (c) =>
            c.nombre?.toLowerCase().includes(query) ||
            c.telefono?.toLowerCase().includes(query) ||
            c.numero?.toLowerCase().includes(query)
        );
    base = [...base].sort((a, b) => {
      if (sort === "nombre_desc") return (b.nombre || "").localeCompare(a.nombre || "");
      if (sort === "reciente") return (b.created_at || "").localeCompare(a.created_at || "");
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
    return base;
  }, [clientes, q, sort]);

  const todosSeleccionados =
    filtrados.length > 0 && filtrados.every((c) => seleccionados.has(c.id));

  function toggleTodos() {
    if (todosSeleccionados) {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        filtrados.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSeleccionados((prev) => {
        const next = new Set(prev);
        filtrados.forEach((c) => next.add(c.id));
        return next;
      });
    }
  }

  function toggleUno(id) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function borrarSeleccionados() {
    if (seleccionados.size === 0) return;
    const confirmado = window.confirm(
      `¿Seguro que quieres borrar ${seleccionados.size} cliente${seleccionados.size > 1 ? "s" : ""}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;

    setBorrando(true);
    setErrorBorrar("");

    const ids = [...seleccionados];
    let erroresFK = [];
    let borrados = [];

    for (const id of ids) {
      const { error } = await supabase.from("clientes_equipos").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") {
          // FK violation: cliente tiene equipos registrados
          const c = clientes.find((x) => x.id === id);
          erroresFK.push(c?.nombre || id);
        } else {
          erroresFK.push(`Error: ${error.message}`);
        }
      } else {
        borrados.push(id);
      }
    }

    setClientes((prev) => prev.filter((c) => !borrados.includes(c.id)));
    setSeleccionados(new Set());
    setBorrando(false);

    if (erroresFK.length > 0) {
      setErrorBorrar(
        `No se pudo borrar: ${erroresFK.join(", ")} — tiene equipos registrados. Borra los equipos primero.`
      );
    }
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre, número o contacto..."
        value={q}
        onChange={(e) => { setQ(e.target.value); setSeleccionados(new Set()); }}
        style={{ marginBottom: 14 }}
      />

      <label htmlFor="sort_clientes" style={{ marginTop: 0 }}>Ordenar por</label>
      <select
        id="sort_clientes"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        style={{ marginBottom: 14 }}
      >
        {SORTS.map((s) => (
          <option key={s.clave} value={s.clave}>{s.label}</option>
        ))}
      </select>

      {puedeEliminar && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer", userSelect: "none", margin: 0 }}>
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={toggleTodos}
              style={{ width: 15, height: 15 }}
            />
            Seleccionar todo{filtrados.length > 0 ? ` (${filtrados.length})` : ""}
          </label>
          {seleccionados.size > 0 && (
            <button
              className="btn"
              style={{ background: "var(--rojo, #d32f2f)", color: "#fff", marginTop: 0, padding: "5px 14px", fontSize: 13 }}
              onClick={borrarSeleccionados}
              disabled={borrando}
              type="button"
            >
              {borrando ? "Borrando..." : `Borrar seleccionados (${seleccionados.size})`}
            </button>
          )}
        </div>
      )}

      {errorBorrar && (
        <div className="error-box" style={{ marginBottom: 12 }}>{errorBorrar}</div>
      )}

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">
            {clientes.length === 0
              ? "Todavía no hay clientes registrados."
              : "Ningún cliente coincide con esa búsqueda."}
          </div>
        ) : (
          filtrados.map((c) => (
            <div
              key={c.id}
              className="list-item"
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
            >
              {puedeEliminar && (
                <input
                  type="checkbox"
                  checked={seleccionados.has(c.id)}
                  onChange={() => toggleUno(c.id)}
                  style={{ width: 15, height: 15, flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <Link
                href={`/app-clientes/clientes/${c.id}`}
                style={{ flex: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
              >
                <div className="list-item-top">
                  <span className="list-item-title">{c.nombre}</span>
                  {c.numero && (
                    <span style={{ fontSize: 12, color: "var(--texto-suave)", marginLeft: 8 }}>
                      #{c.numero}
                    </span>
                  )}
                </div>
                {c.telefono && <div className="list-item-meta">{c.telefono}</div>}
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
