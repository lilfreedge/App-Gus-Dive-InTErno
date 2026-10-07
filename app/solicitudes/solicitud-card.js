"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFecha } from "@/lib/format";
import { estadoSolicitud, ETIQUETA_ESTADO, ordenarItems } from "@/lib/solicitudes";

// Una solicitud con sus códigos. Cada código se marca como recibido por
// separado (pedido explícito: "codigo por codigo, por si algo no llega"),
// con fecha y quién lo recibió; "Deshacer" por si se marcó sin querer.
export default function SolicitudCard({ solicitud, userId, nombreUsuario }) {
  const router = useRouter();
  const supabase = createClient();
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState("");
  const [avisando, setAvisando] = useState(false);

  const items = ordenarItems(solicitud.items);
  const estado = estadoSolicitud(items);
  const etiqueta = ETIQUETA_ESTADO[estado];
  const faltan = items.filter((i) => !i.recibido_at);

  async function marcar(ids, recibido) {
    setOcupado(ids.length === 1 ? ids[0] : "todos");
    setError("");
    const cambios = recibido
      ? { recibido_at: new Date().toISOString(), recibido_por: userId, recibido_por_nombre: nombreUsuario }
      : { recibido_at: null, recibido_por: null, recibido_por_nombre: null };
    const { error: err } = await supabase.from("solicitudes_almacen_items").update(cambios).in("id", ids);
    setOcupado(null);
    if (err) {
      setError(err.message || "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  async function reintentarAviso() {
    setAvisando(true);
    setError("");
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/avisar`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) setError(json.error || "No se pudo avisar al almacén.");
    } catch {
      setError("No se pudo avisar al almacén.");
    } finally {
      setAvisando(false);
      router.refresh();
    }
  }

  return (
    <div className="card">
      <div className="list-item-top">
        <div>
          <div className="list-item-title">Solicitud #{solicitud.folio}</div>
          <div className="hint-text" style={{ marginTop: 2 }}>
            {solicitud.nombre_usuario_snapshot || "—"} · {formatFecha(solicitud.created_at)}
          </div>
        </div>
        <span className={`badge ${etiqueta.badge}`}>{etiqueta.texto}</span>
      </div>

      <table className="table-mini" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th style={{ textAlign: "right" }}>Cant.</th>
            <th style={{ textAlign: "right" }}>Llegó</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td style={{ fontWeight: 700 }}>{i.codigo_snapshot}</td>
              <td>{i.descripcion_snapshot || "—"}</td>
              <td style={{ textAlign: "right" }}>{i.cantidad}</td>
              <td style={{ textAlign: "right" }}>
                {i.recibido_at ? (
                  <div>
                    <div style={{ color: "var(--verde)", fontWeight: 700, fontSize: 12 }}>✓ Recibido</div>
                    <div className="hint-text" style={{ marginTop: 0 }}>
                      {formatFecha(i.recibido_at)}
                      {i.recibido_por_nombre ? ` · ${i.recibido_por_nombre}` : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => marcar([i.id], false)}
                      disabled={!!ocupado}
                      style={{ background: "none", border: "none", padding: 0, color: "var(--texto-suave)", fontSize: 11, textDecoration: "underline", cursor: "pointer" }}
                    >
                      Deshacer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => marcar([i.id], true)}
                    disabled={!!ocupado}
                    style={{ marginTop: 0, width: "auto", padding: "5px 10px", fontSize: 12 }}
                  >
                    {ocupado === i.id ? "..." : "Recibido"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {solicitud.nota && (
        <div style={{ fontSize: 13, background: "var(--superficie-suave)", borderRadius: 8, padding: "8px 10px", marginTop: 10 }}>
          <b>Nota:</b> {solicitud.nota}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <div className="hint-text" style={{ marginTop: 0 }}>
          {solicitud.aviso_enviado_at ? (
            <>✉ Aviso enviado al almacén · {formatFecha(solicitud.aviso_enviado_at)}</>
          ) : (
            <span style={{ color: "var(--rojo)" }}>
              ⚠ No se pudo avisar al almacén{solicitud.aviso_error ? `: ${solicitud.aviso_error}` : "."}{" "}
              <button
                type="button"
                onClick={reintentarAviso}
                disabled={avisando}
                style={{ background: "none", border: "none", padding: 0, color: "var(--azul-claro)", fontWeight: 700, fontSize: 11.5, cursor: "pointer", textDecoration: "underline" }}
              >
                {avisando ? "Enviando..." : "Reintentar aviso"}
              </button>
            </span>
          )}
        </div>
        {faltan.length > 1 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => marcar(faltan.map((i) => i.id), true)}
            disabled={!!ocupado}
            style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
          >
            {ocupado === "todos" ? "Guardando..." : "✓ Llegó todo"}
          </button>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}
    </div>
  );
}
