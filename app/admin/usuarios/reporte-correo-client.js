"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const DETALLES_OPCIONES = [
  { clave: "salidas", etiqueta: "Salidas" },
  { clave: "llenados", etiqueta: "Llenados" },
  { clave: "inspecciones", etiqueta: "Inspecciones visuales" },
  { clave: "mantenimientos", etiqueta: "Mantenimientos de reguladores" },
  { clave: "facturacion", etiqueta: "Facturación pendiente" },
];

const DETALLES_DEFAULT = {
  salidas: true,
  llenados: true,
  inspecciones: true,
  mantenimientos: true,
  facturacion: false,
};

export default function ReporteCorreoConfig({ destinatariosIniciales, detallesIniciales }) {
  const router = useRouter();
  const supabase = createClient();

  const [destinatarios, setDestinatarios] = useState(destinatariosIniciales || []);
  const [detalles, setDetalles] = useState({ ...DETALLES_DEFAULT, ...(detallesIniciales || {}) });
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [errorEmail, setErrorEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState(null);

  async function guardar(destinatariosNuevos, detallesNuevos) {
    setLoading(true);
    setMensaje(null);

    const { error } = await supabase
      .from("app_config")
      .update({ reporte_destinatarios: destinatariosNuevos, reporte_detalles: detallesNuevos })
      .eq("id", true);

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo guardar el cambio." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Guardado." });
    router.refresh();
  }

  function agregarEmail() {
    const email = nuevoEmail.trim();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      setErrorEmail("Correo no válido.");
      return;
    }

    if (destinatarios.includes(email)) {
      setErrorEmail("Ese correo ya está en la lista.");
      return;
    }

    setErrorEmail("");
    const destinatariosNuevos = [...destinatarios, email];
    setDestinatarios(destinatariosNuevos);
    setNuevoEmail("");
    guardar(destinatariosNuevos, detalles);
  }

  function quitarEmail(email) {
    const destinatariosNuevos = destinatarios.filter((e) => e !== email);
    setDestinatarios(destinatariosNuevos);
    guardar(destinatariosNuevos, detalles);
  }

  function toggleDetalle(clave, valor) {
    const detallesNuevos = { ...detalles, [clave]: valor };
    setDetalles(detallesNuevos);
    guardar(destinatarios, detallesNuevos);
  }

  async function enviarAhora() {
    setEnviando(true);
    setMensajeEnvio(null);

    try {
      const res = await fetch("/api/reportes/enviar-ahora", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMensajeEnvio({ tipo: "error", texto: data.error || "No se pudo enviar el reporte." });
        return;
      }

      if (data.info) {
        setMensajeEnvio({ tipo: "error", texto: data.info });
        return;
      }

      setMensajeEnvio({
        tipo: "ok",
        texto: `Reporte enviado a ${data.destinatarios} destinatario(s).`,
      });
    } catch {
      setMensajeEnvio({ tipo: "error", texto: "No se pudo enviar el reporte." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <p className="hint-text" style={{ marginBottom: 8, marginTop: 0 }}>Destinatarios</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {destinatarios.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--texto-suave)" }}>Sin destinatarios configurados.</span>
        )}
        {destinatarios.map((email) => (
          <span
            key={email}
            className="chip-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {email}
            <button
              type="button"
              onClick={() => quitarEmail(email)}
              disabled={loading}
              aria-label={`Quitar ${email}`}
              title="Quitar"
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "inherit",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="email"
          value={nuevoEmail}
          onChange={(e) => {
            setNuevoEmail(e.target.value);
            setErrorEmail("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregarEmail();
            }
          }}
          placeholder="correo@ejemplo.com"
          disabled={loading}
          style={{ flex: "1 1 220px" }}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ width: "auto", marginTop: 0 }}
          disabled={loading}
          onClick={agregarEmail}
        >
          Agregar
        </button>
      </div>
      {errorEmail && <div style={{ marginTop: 6, fontSize: 13, color: "var(--rojo)" }}>{errorEmail}</div>}

      <p className="hint-text" style={{ marginTop: 18, marginBottom: 8 }}>Qué incluir en el reporte</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DETALLES_OPCIONES.map((op) => (
          <label key={op.clave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!detalles[op.clave]}
              disabled={loading}
              onChange={(e) => toggleDetalle(op.clave, e.target.checked)}
            />
            {op.etiqueta}
          </label>
        ))}
      </div>

      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <p className="hint-text" style={{ marginTop: 18, marginBottom: 8 }}>
        Envíalo ahora mismo, sin esperar al lunes.
      </p>
      <button
        type="button"
        className="btn secondary"
        style={{ width: "auto", marginTop: 0 }}
        disabled={enviando}
        onClick={enviarAhora}
      >
        {enviando ? "Enviando..." : "Reporte instantáneo"}
      </button>

      {mensajeEnvio && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensajeEnvio.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensajeEnvio.texto}
        </div>
      )}
    </div>
  );
}
