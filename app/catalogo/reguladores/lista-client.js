"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// La edición ya no se hace desde la lista sino desde la ficha
// (/catalogo/reguladores/[id]) -- toda la tarjeta es un botón que lleva
// ahí (antes era solo el texto "Ver ficha"). esTitular: ve
// "Inactivar/Reactivar" como una acción aparte que no navega (mismo
// patrón que app/catalogo/lista-client.js para Códigos).
export default function ListaReguladores({ reguladores, puedeAdministrar, esTitular }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  async function toggleActivo(e, regulador) {
    e.stopPropagation();
    setLoadingId(regulador.id);
    await supabase
      .from("reguladores_alquiler")
      .update({ activo: !regulador.activo })
      .eq("id", regulador.id);
    setLoadingId(null);
    router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return reguladores;
    return reguladores.filter((r) => r.codigo.toLowerCase().includes(q));
  }, [reguladores, busqueda]);

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar regulador por código..."
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          {reguladores.length === 0
            ? "Aún no hay reguladores de alquiler en el catálogo."
            : "Ningún regulador coincide con esa búsqueda."}
        </div>
      ) : (
        filtrados.map((r) => (
          <div
            className="list-item"
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/catalogo/reguladores/${r.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter") router.push(`/catalogo/reguladores/${r.id}`);
            }}
            style={{ cursor: "pointer" }}
          >
            <div className="list-item-top">
              <span className="list-item-title" style={{ opacity: r.activo ? 1 : 0.5 }}>
                {r.codigo}
              </span>
              {esTitular && (
                <button
                  type="button"
                  onClick={(e) => toggleActivo(e, r)}
                  disabled={loadingId === r.id}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: "none",
                    background: "none",
                    color: "var(--rojo)",
                    cursor: "pointer",
                  }}
                >
                  {r.activo ? "Inactivar" : "Reactivar"}
                </button>
              )}
            </div>
            <div className="list-item-meta">
              {r.proximo_mantenimiento
                ? `Próximo mantenimiento: ${formatFechaDDMMAAAADeDate(r.proximo_mantenimiento)}`
                : "Sin mantenimientos registrados"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
