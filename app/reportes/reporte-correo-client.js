"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash, IconPlus, IconMail } from "@/components/icons";

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

function idAleatorio() {
  return "envio_" + Math.random().toString(36).slice(2, 10);
}

// Un envío = una lista de destinatarios + su propia selección de
// secciones. El id es solo para React (key) y para que el padre sepa a
// cuál actualizar -- no se guarda en la base de datos, ahí cada envío es
// un objeto {destinatarios, detalles} dentro del array reporte_configs.
function EnvioCard({ envio, numero, onChange, onRemove, disabled }) {
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState("");

  function agregarEmail() {
    const email = nuevoEmail.trim();
    if (!email) return;

    if (!EMAIL_REGEX.test(email)) {
      setErrorEmail("Correo no válido.");
      return;
    }
    if (envio.destinatarios.includes(email)) {
      setErrorEmail("Ese correo ya está en la lista.");
      return;
    }

    setErrorEmail("");
    onChange({ destinatarios: [...envio.destinatarios, email] });
    setNuevoEmail("");
  }

  function quitarEmail(email) {
    onChange({ destinatarios: envio.destinatarios.filter((e) => e !== email) });
  }

  function toggleDetalle(clave, valor) {
    onChange({ detalles: { ...envio.detalles, [clave]: valor } });
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>Envío {numero}</span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Quitar envío ${numero}`}
          title="Quitar este envío"
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--rojo)", display: "flex" }}
        >
          <IconTrash size={16} />
        </button>
      </div>

      <p className="hint-text" style={{ marginBottom: 8, marginTop: 0 }}>Destinatarios</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {envio.destinatarios.length === 0 && (
          <span style={{ fontSize: 13, color: "var(--texto-suave)" }}>Sin destinatarios configurados.</span>
        )}
        {envio.destinatarios.map((email) => (
          <span
            key={email}
            className="chip-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {email}
            <button
              type="button"
              onClick={() => quitarEmail(email)}
              disabled={disabled}
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
          disabled={disabled}
          style={{ flex: "1 1 220px" }}
        />
        <button
          type="button"
          className="btn secondary"
          style={{ width: "auto", marginTop: 0 }}
          disabled={disabled}
          onClick={agregarEmail}
        >
          Agregar
        </button>
      </div>
      {errorEmail && <div style={{ marginTop: 6, fontSize: 13, color: "var(--rojo)" }}>{errorEmail}</div>}

      <p className="hint-text" style={{ marginTop: 18, marginBottom: 8 }}>Qué incluir en este envío</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {DETALLES_OPCIONES.map((op) => (
          <label key={op.clave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!envio.detalles[op.clave]}
              disabled={disabled}
              onChange={(e) => toggleDetalle(op.clave, e.target.checked)}
            />
            {op.etiqueta}
          </label>
        ))}
      </div>
    </div>
  );
}

// V12: antes había un único destinatario/selección para todo el reporte
// semanal. Ahora es una LISTA de envíos independientes -- cada uno con su
// propia lista de destinatarios y sus propias secciones (por ejemplo, un
// envío solo de Facturación para contabilidad, y otro con todo para el
// Titular). Vive en Reportes (antes estaba en Administración) y solo la
// ve quien tenga acceso -- Titular siempre, o un administrador al que se
// le haya dado el permiso "correos_semanales".
export default function ReporteCorreoConfig({ enviosIniciales }) {
  const router = useRouter();
  const supabase = createClient();

  const [envios, setEnvios] = useState(
    (enviosIniciales || []).map((e) => ({
      id: idAleatorio(),
      destinatarios: e.destinatarios || [],
      detalles: { ...DETALLES_DEFAULT, ...(e.detalles || {}) },
    }))
  );
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState(null);

  async function guardar(enviosNuevos) {
    setLoading(true);
    setMensaje(null);

    const { error } = await supabase
      .from("app_config")
      .update({
        reporte_configs: enviosNuevos.map((e) => ({ destinatarios: e.destinatarios, detalles: e.detalles })),
      })
      .eq("id", true);

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo guardar el cambio." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Guardado." });
    router.refresh();
  }

  function agregarEnvio() {
    const enviosNuevos = [...envios, { id: idAleatorio(), destinatarios: [], detalles: { ...DETALLES_DEFAULT } }];
    setEnvios(enviosNuevos);
    guardar(enviosNuevos);
  }

  function quitarEnvio(id) {
    const enviosNuevos = envios.filter((e) => e.id !== id);
    setEnvios(enviosNuevos);
    guardar(enviosNuevos);
  }

  function actualizarEnvio(id, patch) {
    const enviosNuevos = envios.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEnvios(enviosNuevos);
    guardar(enviosNuevos);
  }

  async function enviarTodosAhora() {
    setEnviando(true);
    setMensajeEnvio(null);

    try {
      const res = await fetch("/api/reportes/enviar-ahora", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMensajeEnvio({ tipo: "error", texto: data.error || "No se pudo enviar el reporte." });
        return;
      }

      setMensajeEnvio({
        tipo: "ok",
        texto: `Se ${data.enviados === 1 ? "envió 1 correo" : `enviaron ${data.enviados} correos`} (${data.destinatarios} destinatario${data.destinatarios === 1 ? "" : "s"} en total).${
          data.advertencia ? ` ${data.advertencia}` : ""
        }`,
      });
    } catch {
      setMensajeEnvio({ tipo: "error", texto: "No se pudo enviar el reporte." });
    } finally {
      setEnviando(false);
    }
  }

  const hayDestinatarios = envios.some((e) => e.destinatarios.length > 0);

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--texto-suave)", marginTop: 0 }}>
        Cada envío es independiente: puede tener su propia lista de destinatarios y sus propias secciones. Por ejemplo, un envío solo de Facturación para contabilidad y otro con todo para ti.
      </p>

      {envios.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--texto-suave)" }}>Todavía no hay ningún envío configurado.</p>
      )}

      {envios.map((envio, i) => (
        <EnvioCard
          key={envio.id}
          envio={envio}
          numero={i + 1}
          disabled={loading}
          onChange={(patch) => actualizarEnvio(envio.id, patch)}
          onRemove={() => quitarEnvio(envio.id)}
        />
      ))}

      <button
        type="button"
        className="btn secondary"
        style={{ width: "auto", marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
        disabled={loading}
        onClick={agregarEnvio}
      >
        <IconPlus size={14} /> Agregar envío
      </button>

      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul-texto)",
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <p className="hint-text" style={{ marginTop: 22, marginBottom: 8 }}>
        Envía los reportes configurados ahora mismo, sin esperar al lunes.
      </p>
      <button
        type="button"
        className="btn secondary"
        style={{ width: "auto", marginTop: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
        disabled={enviando || !hayDestinatarios}
        onClick={enviarTodosAhora}
      >
        <IconMail size={14} /> {enviando ? "Enviando..." : "Reporte instantáneo"}
      </button>

      {mensajeEnvio && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensajeEnvio.tipo === "error" ? "var(--rojo)" : "var(--azul-texto)",
          }}
        >
          {mensajeEnvio.texto}
        </div>
      )}
    </div>
  );
}
