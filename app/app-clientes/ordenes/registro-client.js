"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import { IconRefresh } from "@/components/icons";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
};

const TABS = [
  { clave: "abiertas", label: "Abiertas" },
  { clave: "por_trabajar", label: "Pendientes por trabajar" },
  { clave: "por_entregar", label: "Pendientes por entregar" },
];

const SORTS = [
  { clave: "fecha_asc", label: "Más antiguas primero" },
  { clave: "fecha_desc", label: "Más recientes primero" },
];

// Cola de trabajo de "Registro" (23-sep-2026, pedido explícito tras
// probar v24 en vivo): ordenes ya viene sin las Entregado (filtradas en
// el server). Acá solo se reparten entre las 3 pestañas + el buscador de
// cliente, todo combinado (tab Y búsqueda a la vez).
export default function RegistroClient({ ordenes }) {
  const [tab, setTab] = useState("abiertas");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("fecha_asc");

  const filtrados = useMemo(() => {
    let base = ordenes;
    if (tab === "por_trabajar") {
      base = base.filter((o) => o.estado === "Pendiente por trabajar" || o.estado === "En proceso");
    } else if (tab === "por_entregar") {
      base = base.filter((o) => o.estado === "Pendiente por despachar");
    }
    const query = q.trim().toLowerCase();
    if (query) {
      base = base.filter((o) => o.cliente_nombre_snapshot?.toLowerCase().includes(query));
    }
    base = [...base].sort((a, b) =>
      sort === "fecha_desc" ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha)
    );
    return base;
  }, [ordenes, tab, q, sort]);

  return (
    <div>
      <div className="period-toggle" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.clave}
            type="button"
            className={`period-btn ${tab === t.clave ? "period-btn-active" : ""}`}
            onClick={() => setTab(t.clave)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Buscar cliente con órdenes abiertas..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
      />

      <label htmlFor="sort_ordenes" style={{ marginTop: 0 }}>Ordenar por</label>
      <select id="sort_ordenes" value={sort} onChange={(e) => setSort(e.target.value)} style={{ marginBottom: 14 }}>
        {SORTS.map((s) => (
          <option key={s.clave} value={s.clave}>{s.label}</option>
        ))}
      </select>

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">
            {ordenes.length === 0 ? "No hay órdenes abiertas." : "Ninguna orden coincide con esos filtros."}
          </div>
        ) : (
          filtrados.map((o) => (
            <div key={o.id} className="list-item" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href={`/app-clientes/ordenes/${o.id}`}
                style={{ display: "block", flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}
              >
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
                    {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                  </span>
                  <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
                </div>
                <div className="list-item-bottom">
                  {/* Folio quitado de aquí (pedido explícito, 27-sep-2026:
                      "borra el folio de aqui, ponlo invisible") -- en esta
                      lista ya no se muestra, solo el No. de orden del
                      talonario (arriba) y la fecha. */}
                  <div className="list-item-meta">{formatFechaDDMMAAAADeDate(o.fecha)}</div>
                </div>
              </Link>
              {/* Shortcut a "Actualizar estado de orden" (item 11, pedido
                  explícito, 25-sep-2026: "poner boton aqui tipo shortcut
                  para llegar a 'Actualizar estado de orden', en cada
                  orden") -- evita tener que entrar primero a la ficha.
                  ?from=registro (item 11a) le dice a esa pantalla que la
                  miga de pan debe decir "Registro de Órdenes", no "Listado
                  de órdenes". Ícono de refrescar (item 3, pedido explícito,
                  27-sep-2026: "cambiar icono de seguimiento en registro de
                  ordenes... quiero algo relacionado con 'actualizar
                  estado'") -- antes era un check (26-sep-2026, para
                  diferenciarlo del lápiz de "Editar/anular la orden"), pero
                  el usuario pidió algo más asociado a "actualizar estado". */}
              <Link
                href={`/app-clientes/ordenes/${o.id}/editar?from=registro`}
                className="icon-btn"
                aria-label="Actualizar estado de orden"
                title="Actualizar estado de orden"
                style={{ flexShrink: 0 }}
              >
                <IconRefresh size={15} />
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
