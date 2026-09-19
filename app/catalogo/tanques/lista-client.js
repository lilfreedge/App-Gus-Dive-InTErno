"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconEdit } from "@/components/icons";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// puedeAdministrar (permiso catalogo_tanque, o Titular): ve el lápiz de
// editar. esTitular: además ve "Inactivar/Reactivar" (mismo patrón que
// app/catalogo/lista-client.js para Códigos).
export default function ListaTanques({ tanques, puedeAdministrar, esTitular }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  async function toggleActivo(tanque) {
    setLoadingId(tanque.id);
    await supabase
      .from("tanques_alquiler")
      .update({ activo: !tanque.activo })
      .eq("id", tanque.id);
    setLoadingId(null);
    router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tanques;
    return tanques.filter((t) => t.codigo.toLowerCase().includes(q));
  }, [tanques, busqueda]);

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar tanque por código..."
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          {tanques.length === 0
            ? "Aún no hay tanques de alquiler en el catálogo."
            : "Ningún tanque coincide con esa búsqueda."}
        </div>
      ) : (
        filtrados.map((t) => (
          <div className="list-item" key={t.id}>
            <div className="list-item-top">
              <span className="list-item-title" style={{ opacity: t.activo ? 1 : 0.5 }}>
                {t.codigo}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {puedeAdministrar && (
                  <Link
                    href={`/catalogo/tanques/${t.id}/editar`}
                    className="icon-btn"
                    aria-label="Editar"
                    title="Editar"
                  >
                    <IconEdit size={15} />
                  </Link>
                )}
                {esTitular && (
                  <button
                    type="button"
                    onClick={() => toggleActivo(t)}
                    disabled={loadingId === t.id}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: "none",
                      background: "none",
                      color: "var(--rojo)",
                      cursor: "pointer",
                    }}
                  >
                    {t.activo ? "Inactivar" : "Reactivar"}
                  </button>
                )}
              </div>
            </div>
            {t.descripcion && <div className="list-item-note">{t.descripcion}</div>}
            <div className="list-item-meta">
              {t.proxima_inspeccion
                ? `Próxima inspección: ${formatFechaDDMMAAAADeDate(t.proxima_inspeccion)}`
                : "Sin inspecciones registradas"}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
