"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconTrash, IconPlus, IconSend, IconLock, IconCheck, IconMail } from "@/components/icons";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// Ítem 2 del backlog (22-sep-2026): se quitó "Facturación pendiente" -- la
// maqueta aprobada no la trae, y nunca estuvo conectada a datos reales
// (obtenerEnviosConfigurados en lib/reportes.js no la lee).
const DETALLES_OPCIONES = [
  { clave: "salidas", etiqueta: "Salidas" },
  { clave: "llenados", etiqueta: "Llenados" },
  { clave: "inspecciones", etiqueta: "Inspecciones" },
  { clave: "mantenimientos", etiqueta: "Mantenimientos" },
];

const DETALLES_DEFAULT = {
  salidas: true,
  llenados: true,
  inspecciones: true,
  mantenimientos: true,
};

function idAleatorio() {
  return "envio_" + Math.random().toString(36).slice(2, 10);
}

// Un envío = una lista de destinatarios + su propia selección de
// secciones. El id es solo para React (key) y para que el padre sepa a
// cuál actualizar -- no se guarda en la base de datos, ahí cada envío es
// un objeto {destinatarios, detalles} dentro del array reporte_configs.
// `indice` es la posición dentro de ese array (para "Enviar solo esto
// ahora", que le pasa al backend cuál de los envíos guardados mandar).
function EnvioCard({ envio, numero, indice, onChange, onRemove, disabled, guardando }) {
  const [nuevoEmail, setNuevoEmail] = useState("");
  const [errorEmail, setErrorEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

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

  async function enviarSoloEsto() {
    setEnviando(true);
    setMensaje(null);

    try {
      const res = await fetch(`/api/reportes/enviar-ahora?indice=${indice}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo enviar." });
        return;
      }

      setMensaje({ tipo: "ok", texto: `Enviado a ${data.destinatarios} destinatario${data.destinatarios === 1 ? "" : "s"}.` });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo enviar." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 10.5, color: "var(--texto-suave)", textTransform: "uppercase", letterSpacing: 0.4 }}>
          Envío {numero}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={`Quitar envío ${numero}`}
          title="Quitar este envío"
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--texto-suave)", display: "flex" }}
        >
          <IconTrash size={15} />
        </button>
      </div>

      <p className="hint-text" style={{ marginBottom: 8, marginTop: 0 }}>Destinatarios</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
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

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
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
      {errorEmail && <div style={{ marginTop: -6, marginBottom: 10, fontSize: 13, color: "var(--rojo)" }}>{errorEmail}</div>}

      <p className="hint-text" style={{ marginBottom: 8 }}>Qué incluir</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginBottom: 14 }}>
        {DETALLES_OPCIONES.map((op) => (
          <label key={op.clave} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <input
              type="checkbox"
              checked={!!envio.detalles[op.clave]}
              disabled={disabled}
              onChange={(e) => toggleDetalle(op.clave, e.target.checked)}
              style={{ width: "auto" }}
            />
            {op.etiqueta}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--verde)" }}>
          <IconCheck size={11} strokeWidth="3" />
          <span style={{ fontSize: 10, fontWeight: 700 }}>{guardando ? "Guardando..." : "Guardado"}</span>
        </div>
        <button
          type="button"
          onClick={enviarSoloEsto}
          disabled={disabled || enviando || envio.destinatarios.length === 0}
          style={{
            border: "none",
            background: "none",
            padding: 0,
            cursor: "pointer",
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--azul-claro)",
          }}
        >
          {enviando ? "Enviando..." : "Enviar solo esto ahora →"}
        </button>
      </div>
      {mensaje && (
        <div style={{ marginTop: 8, fontSize: 12, color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul-claro)" }}>
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}

// V12: antes había un único destinatario/selección para todo el reporte
// semanal. Ahora es una LISTA de envíos independientes -- cada uno con su
// propia lista de destinatarios y sus propias secciones. Vive en Reportes
// (antes estaba en Administración) y solo la ve quien tenga acceso --
// Titular siempre, o un administrador al que se le haya dado el permiso
// "correos_semanales".
// V14 (ítem 2 del backlog, 22-sep-2026): rediseño exacto según la maqueta
// aprobada (Design canvas) -- ya no vive detrás de un acordeón colapsado,
// lleva su propio badge/encabezado, y cada tarjeta tiene "Enviar solo esto
// ahora" además del botón general "Reporte instantáneo".
export default function ReporteCorreoConfig({ enviosIniciales, esTitular }) {
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
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ color: "var(--rojo)", display: "flex" }}>
          <IconLock size={14} />
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--rojo)", textTransform: "uppercase", letterSpacing: 0.3 }}>
          {esTitular ? "Solo visible para ti (Titular)" : "Solo visible para quienes tienen este permiso"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
        <div style={{ color: "var(--azul)", display: "flex" }}>
          <IconMail size={15} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--azul-texto)" }}>Reportes automáticos</div>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--texto-suave)", marginTop: 0, marginBottom: 14 }}>
        Cada envío tiene su propio destinatario y sus propias secciones — así una persona puede recibir solo Salidas y otra solo Llenados, por ejemplo.
      </p>

      {envios.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--texto-suave)" }}>Todavía no hay ningún envío configurado.</p>
      )}

      {envios.map((envio, i) => (
        <EnvioCard
          key={envio.id}
          envio={envio}
          numero={i + 1}
          indice={i}
          disabled={loading}
          guardando={loading}
          onChange={(patch) => actualizarEnvio(envio.id, patch)}
          onRemove={() => quitarEnvio(envio.id)}
        />
      ))}

      <button
        type="button"
        style={{
          width: "100%",
          marginTop: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "13px 16px",
          borderRadius: 9,
          border: "1px dashed var(--azul-claro)",
          background: "var(--tarjeta)",
          color: "var(--azul-claro)",
          fontWeight: 700,
          fontSize: 14.5,
          cursor: "pointer",
          boxSizing: "border-box",
        }}
        disabled={loading}
        onClick={agregarEnvio}
      >
        <IconPlus size={14} /> Agregar otro envío
      </button>

      {mensaje && (
        <div
          style={{
            marginTop: -8,
            marginBottom: 14,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul-texto)",
          }}
        >
          {mensaje.texto}
        </div>
      )}

      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--azul-texto)", marginBottom: 4 }}>
          Enviar todos ahora
        </div>
        <p style={{ fontSize: 11.5, color: "var(--texto-suave)", marginTop: 0, marginBottom: 14 }}>
          Manda {envios.length === 1 ? "el envío configurado arriba" : `los ${envios.length} envíos configurados arriba`}, cada uno a su destinatario con sus secciones, sin esperar al lunes.
        </p>
        <button
          type="button"
          className="btn btn-primary"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          disabled={enviando || !hayDestinatarios}
          onClick={enviarTodosAhora}
        >
          <IconSend size={15} /> {enviando ? "Enviando..." : "Reporte instantáneo"}
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
    </div>
  );
}
