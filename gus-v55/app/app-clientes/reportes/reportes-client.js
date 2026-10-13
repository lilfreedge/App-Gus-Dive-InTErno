"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

// Lista de Reportes e Informes (23-sep-2026) -- mismo patrón visual que
// Listado de órdenes, ya filtrada del lado del servidor a solo Reguladores.
// Cada fila da acceso a dos cosas por orden (28-sep-2026, pedido explícito:
// "transformar boton de reportes a 'reportes e Informes'" + "y que figuren
// los informes de los reguladores ahi") -- el Reporte de seguimiento (ya
// existía) y el Informe de mantenimiento (item 36, antes solo se llegaba
// desde dentro de la ficha de la orden). Por eso la fila entera dejó de
// ser un solo <Link> y ahora es un contenedor con dos links chicos abajo.
export default function ReportesClient({ ordenes, puedeVerInforme = false }) {
  const [q, setQ] = useState("");

  const filtradas = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ordenes;
    return ordenes.filter((o) => o.cliente_nombre_snapshot?.toLowerCase().includes(query));
  }, [ordenes, q]);

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
      />
      <div className="card">
        {filtradas.length === 0 ? (
          <div className="empty">
            {ordenes.length === 0 ? "Todavía no hay órdenes de reguladores registradas." : "Ningún cliente coincide con la búsqueda."}
          </div>
        ) : (
          filtradas.map((o) => {
            const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
            return (
              <div key={o.id} className="list-item">
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
                    {o.cliente_nombre_snapshot}
                    {marcaModelo ? ` — ${marcaModelo}` : ""}
                  </span>
                  <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
                </div>
                <div className="list-item-bottom">
                  <div className="list-item-meta">{formatFechaDDMMAAAADeDate(o.fecha)}</div>
                  <div className="folio-discreto">folio #{o.folio}</div>
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                  <Link
                    href={`/app-clientes/reportes/${o.id}`}
                    style={{ fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
                  >
                    Ver reporte de seguimiento →
                  </Link>
                  {puedeVerInforme && (
                    <Link
                      href={`/app-clientes/ordenes/${o.id}/informe`}
                      style={{ fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
                    >
                      Ver informe de mantenimiento →
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
