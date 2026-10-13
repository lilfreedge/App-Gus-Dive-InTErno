"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Correos del almacén que reciben el aviso de cada solicitud nueva (V29,
// pedido explícito: "ponlo para que se configure en administracion o
// algun lado del app") -- se guardan en app_config.solicitudes_correos
// (migration_52.sql). Solo el Titular entra a Administración, y la
// política de app_config solo le deja guardar a él.
export default function CorreosAlmacen({ correosIniciales }) {
  const router = useRouter();
  const supabase = createClient();
  const [correos, setCorreos] = useState(correosIniciales || []);
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar(lista) {
    setGuardando(true);
    setMensaje(null);
    const { error } = await supabase.from("app_config").update({ solicitudes_correos: lista }).eq("id", true);
    setGuardando(false);
    if (error) {
      setMensaje({ tipo: "error", texto: error.message || "No se pudo guardar." });
      return false;
    }
    setCorreos(lista);
    setMensaje({ tipo: "ok", texto: "Guardado." });
    router.refresh();
    return true;
  }

  async function agregar(e) {
    e.preventDefault();
    const correo = nuevo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setMensaje({ tipo: "error", texto: "Escribe un correo válido." });
      return;
    }
    if (correos.includes(correo)) {
      setMensaje({ tipo: "error", texto: "Ese correo ya está en la lista." });
      return;
    }
    if (await guardar([...correos, correo])) setNuevo("");
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 12 }}>
        A estos correos les llega el aviso cada vez que alguien hace una solicitud de códigos. Mientras el dominio
        gusdivecenter.com no esté verificado en Resend, el aviso solo puede llegarle al correo dueño de la cuenta de
        Resend.
      </p>

      {correos.length === 0 ? (
        <div className="empty" style={{ padding: "8px 0" }}>Todavía no hay correos del almacén.</div>
      ) : (
        correos.map((c) => (
          <div key={c} className="list-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14 }}>{c}</span>
            <button
              type="button"
              onClick={() => guardar(correos.filter((x) => x !== c))}
              disabled={guardando}
              style={{ background: "none", border: "none", color: "var(--rojo)", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
            >
              Quitar
            </button>
          </div>
        ))
      )}

      <form onSubmit={agregar} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input type="email" value={nuevo} onChange={(e) => setNuevo(e.target.value)} placeholder="almacen@ejemplo.com" />
        <button type="submit" className="btn btn-primary" disabled={guardando} style={{ marginTop: 0, width: "auto", whiteSpace: "nowrap" }}>
          + Agregar
        </button>
      </form>

      {mensaje && (
        <div style={{ marginTop: 8, fontSize: 13, color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)" }}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
