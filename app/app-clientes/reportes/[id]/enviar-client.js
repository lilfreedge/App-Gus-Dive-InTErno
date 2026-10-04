"use client";

import { useState } from "react";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// "Enviar por correo" (item 15, pedido explícito: "agrega en alguna
// parte de esta ventana para poder ver y descargar o enviar por correo
// el reporte" -- "si como lo tenemos en app interno"). Mismo patrón que
// app/reportes/form-client.js: un input de correo destino + un botón,
// sin modal (aquí ya estamos en la pantalla del reporte, no en un
// preview aparte).
// `vista` ("simple" | "completo", 1-oct-2026) -- cuál de las dos versiones
// del Recibo mandar, para que coincida con lo que se está viendo en
// pantalla al momento de enviarlo.
export default function EnviarReporteClient({ ordenId, vista = "simple" }) {
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
      const res = await fetch(`/api/reportes-clientes/${ordenId}/enviar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: destino, vista }),
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
      <button className="btn secondary" type="button" onClick={() => setAbierto(true)} style={{ marginTop: 0 }}>
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
