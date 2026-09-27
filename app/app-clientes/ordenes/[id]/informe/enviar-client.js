"use client";

import { useState } from "react";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// "Enviar por correo" el Informe de mantenimiento -- mismo patrón que
// app/app-clientes/reportes/[id]/enviar-client.js.
export default function EnviarInformeClient({ ordenId }) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState("");

  async function enviar() {
    const destino = correo.trim();
    if (!destino) return setError("Escribe a qué correo mandarlo.");
    if (!EMAIL_REGEX.test(destino)) return setError("Ese correo no es válido.");
    setError("");
    setEnviando(true);
    setMensaje(null);

    try {
      const res = await fetch(`/api/informes-mantenimiento/${ordenId}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: destino }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo enviar el correo." });
        return;
      }
      setMensaje({ tipo: "ok", texto: `Enviado a ${data.correo}.` });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo enviar el correo." });
    } finally {
      setEnviando(false);
    }
  }

  if (!abierto) {
    return (
      <button className="btn btn-primary" type="button" onClick={() => setAbierto(true)} style={{ marginTop: 0 }}>
        Enviar por correo
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
      <div>
        <input
          type="email"
          value={correo}
          onChange={(e) => {
            setCorreo(e.target.value);
            setError("");
          }}
          placeholder="correo@ejemplo.com"
          disabled={enviando}
          style={{ marginTop: 0, minWidth: 220 }}
        />
        {error && <div style={{ marginTop: 4, fontSize: 12.5, color: "var(--rojo)" }}>{error}</div>}
        {mensaje && (
          <div style={{ marginTop: 4, fontSize: 12.5, color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--verde)" }}>
            {mensaje.texto}
          </div>
        )}
      </div>
      <button className="btn btn-primary" type="button" onClick={enviar} disabled={enviando} style={{ marginTop: 0 }}>
        {enviando ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}
