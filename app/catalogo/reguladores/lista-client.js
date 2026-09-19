"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// La edición ya no se hace desde la lista sino desde la ficha
// (/catalogo/reguladores/[id]). esTitular: ve "Inactivar/Reactivar"
// (mismo patrón que app/catalogo/lista-client.js para Códigos).
export default function ListaReguladores({ reguladores, puedeAdministrar, esTitular }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  async function toggleActivo(regulador) {
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
          <div className="list-item" key={r.id}>
            <div className="list-item-top">
              <span className="list-item-title" style={{ opacity: r.activo ? 1 : 0.5 }}>
                {r.codigo}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link
                  href={`/catalogo/reguladores/${r.id}`}
                  style={{ fontSize: 12.5, fontWeight: 600, color: "var(--azul-claro)" }}
                >
                  Ver ficha
                </Link>
                {esTitular && (
                  <button
                    type="button"
                    onClick={() => toggleActivo(r)}
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
            </div>
            {r.descripcion && <div className="list-item-note">{r.descripcion}</div>}
          </div>
        ))
      )}
    </div>
  );
}
