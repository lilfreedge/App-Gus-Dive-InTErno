"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

// V68 ("26. A", maqueta V68): borrar un compresor, solo el Titular, y solo si
// no tiene historial (mantenimientos, inspecciones ni recordatorios hechos).
// Si tiene, no se borra para no perder ese historial: se inactiva. Pide el
// motivo y escribir BORRAR; queda en Anulaciones y ediciones.
export default function BorrarCompresor({ compresor, historial }) {
  const router = useRouter();
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function borrar() {
    setLoading(true);
    setError("");
    await registrarCambio(supabase, { tabla: "compresores", registroId: compresor.id, accion: "borrar", datosAnteriores: compresor, motivo: motivo.trim() });
    const { data, error: e } = await supabase.from("compresores").delete().eq("id", compresor.id).select("id");
    setLoading(false);
    if (e || !data?.length) return setError(e?.message?.includes("foreign key") ? "Tiene historial, así que no se puede borrar. Inactívalo." : e?.message || "No se pudo borrar. Solo el Titular puede.");
    router.push("/equipos/compresores");
    router.refresh();
  }

  if (historial > 0)
    return (
      <div className="vj-borrar" style={{ marginTop: 14 }}>
        <b>Borrar compresor</b>
        <div className="hint-text" style={{ margin: "4px 0 0" }}>
          Tiene historial ({historial} {historial === 1 ? "registro" : "registros"}), así que no se puede borrar. Usa &quot;Inactivar compresor&quot;: deja de salir y su historial se queda.
        </div>
      </div>
    );

  return (
    <div className="vj-borrar" style={{ marginTop: 14 }}>
      {abierto ? (
        <>
          <b>Borrar compresor</b>
          <div className="hint-text" style={{ margin: "4px 0 8px" }}>
            No tiene historial. Queda anotado en Anulaciones y ediciones.
          </div>
          <input placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <input placeholder="Escribe BORRAR" value={conf} onChange={(e) => setConf(e.target.value)} style={{ marginTop: 6 }} />
          {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary" style={{ marginTop: 0, background: "var(--rojo)" }} disabled={loading || !motivo.trim() || conf.trim().toUpperCase() !== "BORRAR"} onClick={borrar}>
              {loading ? "Borrando…" : "Borrar"}
            </button>
            <button className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <button className="btn secondary" type="button" onClick={() => setAbierto(true)}>
          Borrar compresor…
        </button>
      )}
    </div>
  );
}
