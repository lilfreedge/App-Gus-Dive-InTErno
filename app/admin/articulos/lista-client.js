"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ListaArticulos({ articulos }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

  async function toggleActivo(articulo) {
    setLoadingId(articulo.id);
    await supabase
      .from("articulos")
      .update({ activo: !articulo.activo })
      .eq("id", articulo.id);
    setLoadingId(null);
    router.refresh();
  }

  if (articulos.length === 0) {
    return <div className="empty">Aún no has agregado artículos al catálogo.</div>;
  }

  return (
    <div>
      {articulos.map((a) => (
        <div className="list-item" key={a.id}>
          <div className="list-item-top">
            <span className="list-item-title" style={{ opacity: a.activo ? 1 : 0.5 }}>
              {a.nombre}
            </span>
            <button
              className="chip-btn"
              onClick={() => toggleActivo(a)}
              disabled={loadingId === a.id}
            >
              {a.activo ? "Activo" : "Desactivado"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
