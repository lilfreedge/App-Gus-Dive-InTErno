"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFecha } from "@/lib/format";

// Lista de cuentas pendientes de aprobación (item 10, 1-oct-2026) --
// "Aprobar" pone profiles.aprobado = true; desde ese momento el
// middleware deja pasar a ese usuario a cualquier app para la que ya
// tenga acceso (ver /espacio/accesos -- un perfil nuevo nace sin acceso
// a ninguna de las dos, así que normalmente hay que darle acceso ahí
// TAMBIÉN después de aprobarlo).
export default function AprobacionesClient({ pendientes }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingId, setLoadingId] = useState(null);

  async function aprobar(id) {
    setLoadingId(id);
    await supabase.from("profiles").update({ aprobado: true }).eq("id", id);
    setLoadingId(null);
    router.refresh();
  }

  if (pendientes.length === 0) {
    return <div className="empty">No hay cuentas nuevas esperando aprobación.</div>;
  }

  return (
    <div className="card">
      {pendientes.map((p) => (
        <div key={p.id} className="list-item" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div className="list-item-title">{p.full_name}</div>
            <div className="hint-text" style={{ marginTop: 2 }}>Se registró el {formatFecha(p.created_at)}</div>
          </div>
          <button className="btn btn-primary" type="button" style={{ marginTop: 0, width: "auto" }} disabled={loadingId === p.id} onClick={() => aprobar(p.id)}>
            {loadingId === p.id ? "Aprobando..." : "Aprobar"}
          </button>
        </div>
      ))}
    </div>
  );
}
