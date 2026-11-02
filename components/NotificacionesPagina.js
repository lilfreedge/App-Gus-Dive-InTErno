"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CelularAvisos } from "@/components/viajes/Avisos";
import { formatFecha } from "@/lib/format";

// V52 -- "Ver todas y configurar" de la campanita (App Interno y App Equipos
// de clientes): todas las notificaciones, marcarlas leídas y activar el
// celular (las mismas notificaciones del celular que Buceos).
export default function NotificacionesPagina({ app, puedeAdministrar = false, rutaAdmin = null, explicacion = null, sinCelular = false }) {
  const supabase = createClient();
  const [lista, setLista] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("notificaciones").select("*").eq("app", app).order("creado_en", { ascending: false }).limit(100);
      setLista(data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  const avisar = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  };

  async function marcarTodas() {
    const ids = (lista || []).filter((n) => !n.leida_en).map((n) => n.id);
    if (!ids.length) return;
    const ahora = new Date().toISOString();
    await supabase.from("notificaciones").update({ leida_en: ahora }).in("id", ids);
    setLista((l) => l.map((n) => (ids.includes(n.id) ? { ...n, leida_en: ahora } : n)));
  }

  async function marcarUna(id) {
    const ahora = new Date().toISOString();
    setLista((l) => l.map((n) => (n.id === id ? { ...n, leida_en: ahora } : n)));
    await supabase.from("notificaciones").update({ leida_en: ahora }).eq("id", id);
  }
  const sinLeer = (lista || []).filter((n) => !n.leida_en).length;

  return (
    <div>
      {msg && <div className="success-box">{msg}</div>}
      <div className="hint-text" style={{ margin: "0 0 12px" }}>
        {/* V54: Control Estudiantes pone su propia explicación. */}
        {explicacion || "Cuando alguien marca \"Listo\" en un aviso fijo que tú pusiste, te llega aquí, por correo y al celular (si lo activas abajo)."}
      </div>
      {puedeAdministrar && rutaAdmin && (
        <Link href={rutaAdmin}>
          <button type="button" className="btn secondary" style={{ width: "auto", margin: "0 0 14px" }}>
            Administrar avisos fijos
          </button>
        </Link>
      )}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div className="section-title" style={{ margin: 0 }}>
            Notificaciones{sinLeer ? ` (${sinLeer} sin leer)` : ""}
          </div>
          {sinLeer > 0 && (
            <button type="button" className="btn secondary af-mini" onClick={marcarTodas}>
              Marcar todo leído
            </button>
          )}
        </div>
        {lista === null && <div className="empty">Cargando…</div>}
        {lista && !lista.length && <div className="empty">No tienes notificaciones todavía.</div>}
        {(lista || []).map((n) => (
          <div key={n.id} className="campana-fila">
            <a href={n.url || "#"} className={`campana-item${n.leida_en ? "" : " nuevo"}`} style={{ borderRadius: 8 }}>
              <span className="campana-dot" style={n.leida_en ? { visibility: "hidden" } : null} />
              <span style={{ minWidth: 0 }}>
                <b>{n.titulo}</b>
                {n.texto && <span className="campana-txt">{n.texto}</span>}
                <small>{formatFecha(n.creado_en)}</small>
              </span>
            </a>
            {/* V59: "Leído" en cada una. */}
            {!n.leida_en && (
              <button type="button" className="campana-leido" onClick={() => marcarUna(n.id)}>
                Leído
              </button>
            )}
          </div>
        ))}
      </div>
      {/* V54: Control Estudiantes por ahora solo avisa en la campanita. */}
      {!sinCelular && (
        <>
          <div className="section-title">En este celular o computadora</div>
          <CelularAvisos avisar={avisar} />
        </>
      )}
    </div>
  );
}
