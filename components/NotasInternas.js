"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconLock } from "@/components/icons";
import { formatFecha } from "@/lib/format";

// V50 -- Notas internas de una orden (nota "App Gus interno": "me gustaría
// tener algún lado para poder escribir cosas como notas internas... algo como
// 'lo dejé conectado a un tanque al lado del escritorio'"). Son distintas de
// la "Nota" del Seguimiento ("son cosas distintas, este... es solo para
// casos internos"). Cualquiera que vea la orden las ve y escribe, también el
// técnico ("si. Cualquiera puede"). El cliente nunca las ve. Tabla
// ordenes_notas_internas (migration_75.sql); si todavía no existe, no sale.
export default function NotasInternas({ ordenId, nombre = "", puedeQuitarTodas = false }) {
  const supabase = createClient();
  const [notas, setNotas] = useState(null);
  const [yoId, setYoId] = useState(null);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: u }, { data, error: e }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("ordenes_notas_internas").select("*").eq("orden_id", ordenId).order("creado_en", { ascending: false }),
      ]);
      if (!vivo) return;
      setYoId(u?.user?.id || null);
      setNotas(e ? false : data || []);
    })();
    return () => {
      vivo = false;
    };
  }, [ordenId]);

  if (notas === false || notas === null) return null;

  async function agregar() {
    const t = texto.trim();
    if (!t || guardando) return;
    setGuardando(true);
    setError("");
    const { data, error: e } = await supabase
      .from("ordenes_notas_internas")
      .insert({ orden_id: ordenId, user_id: yoId, nombre: nombre || "", texto: t })
      .select()
      .single();
    setGuardando(false);
    if (e) return setError("No se pudo guardar la nota. Intenta de nuevo.");
    setNotas([data, ...notas]);
    setTexto("");
  }

  async function quitar(id) {
    const { error: e } = await supabase.from("ordenes_notas_internas").delete().eq("id", id);
    if (e) return setError("No se pudo quitar la nota.");
    setNotas(notas.filter((n) => n.id !== id));
    setQuitando(null);
  }

  return (
    <div className="notas-int">
      <div className="notas-int-t">
        <IconLock size={14} /> Notas internas · no las ve el cliente
      </div>
      {notas.map((n) => (
        <div key={n.id} className="nota-i">
          <div className="nota-i-meta">
            <span>
              {n.nombre || "—"} · {formatFecha(n.creado_en)}
            </span>
            {(n.user_id === yoId || puedeQuitarTodas) &&
              (quitando === n.id ? (
                <span>
                  ¿Quitarla?{" "}
                  <button type="button" onClick={() => quitar(n.id)}>
                    Sí
                  </button>{" "}
                  <button type="button" style={{ color: "var(--texto-suave)" }} onClick={() => setQuitando(null)}>
                    No
                  </button>
                </span>
              ) : (
                <button type="button" onClick={() => setQuitando(n.id)}>
                  Quitar
                </button>
              ))}
          </div>
          {n.texto}
        </div>
      ))}
      <div className="nota-add">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), agregar())}
          placeholder="Escribe una nota interna…"
        />
        <button type="button" className="btn btn-primary" disabled={!texto.trim() || guardando} onClick={agregar}>
          {guardando ? "Guardando…" : "Agregar"}
        </button>
      </div>
      {error && <div className="error-msg">⚠ {error}</div>}
    </div>
  );
}
