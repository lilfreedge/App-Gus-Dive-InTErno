"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ListaUsuarios({ perfiles, miId }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

  async function toggleAdmin(perfil) {
    if (perfil.id === miId && perfil.is_admin) {
      const ok = window.confirm(
        "Te vas a quitar el acceso de administrador a ti mismo. ¿Seguro?"
      );
      if (!ok) return;
    }

    setLoadingId(perfil.id);
    await supabase
      .from("profiles")
      .update({ is_admin: !perfil.is_admin })
      .eq("id", perfil.id);
    setLoadingId(null);
    router.refresh();
  }

  return (
    <div>
      {perfiles.map((p) => (
        <div className="list-item" key={p.id}>
          <div className="list-item-top">
            <span className="list-item-title">
              {p.full_name}
              {p.id === miId && <span className="tag-tu">Tú</span>}
            </span>
            <button
              className="chip-btn"
              onClick={() => toggleAdmin(p)}
              disabled={loadingId === p.id}
            >
              {p.is_admin ? "Administrador" : "Empleado"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
