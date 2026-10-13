"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconEdit } from "@/components/icons";

// puedeAdministrar (Titular o Administrador): ve el lápiz de editar y
// "Ver movimientos". esTitular: además ve "Inactivar" — ni siquiera un
// Administrador común lo ve (regla nueva de V4).
export default function ListaArticulos({ articulos, puedeAdministrar, esTitular }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  async function toggleActivo(articulo) {
    setLoadingId(articulo.id);
    await supabase
      .from("articulos")
      .update({ activo: !articulo.activo })
      .eq("id", articulo.id);
    setLoadingId(null);
    router.refresh();
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return articulos;
    return articulos.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [articulos, busqueda]);

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar artículo por nombre o código..."
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="empty">
          {articulos.length === 0
            ? "Aún no hay artículos en el catálogo."
            : "Ningún artículo coincide con esa búsqueda."}
        </div>
      ) : (
        filtrados.map((a) => (
          <div className="list-item" key={a.id}>
            <div className="list-item-top">
              <span className="list-item-title" style={{ opacity: a.activo ? 1 : 0.5 }}>
                {a.nombre}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {puedeAdministrar && (
                  <Link
                    href={`/catalogo/${a.id}/editar`}
                    className="icon-btn"
                    aria-label="Editar"
                    title="Editar"
                  >
                    <IconEdit size={15} />
                  </Link>
                )}
                {puedeAdministrar && (
                  <Link href={`/catalogo/${a.id}/movimientos`}>
                    <button className="chip-btn" type="button">
                      Ver movimientos
                    </button>
                  </Link>
                )}
                {esTitular && (
                  <button
                    type="button"
                    onClick={() => toggleActivo(a)}
                    disabled={loadingId === a.id}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      border: "none",
                      background: "none",
                      color: "var(--rojo)",
                      cursor: "pointer",
                    }}
                  >
                    {a.activo ? "Inactivar" : "Reactivar"}
                  </button>
                )}
              </div>
            </div>
            {a.descripcion && <div className="list-item-note">{a.descripcion}</div>}
          </div>
        ))
      )}
    </div>
  );
}
