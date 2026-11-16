"use client";

import { useEffect, useState } from "react";

// V91 (maqueta v92, aprobada): la página que abre el instructor al escanear el QR
// de la tienda. No pide cuenta ni nombre: solo confirma que recibió el presupuesto.
export default function ConfirmarEntrega() {
  const [t, setT] = useState("");
  const [info, setInfo] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const tok = new URLSearchParams(window.location.search).get("t") || "";
    setT(tok);
    if (!tok) {
      setEstado("error");
      setMensaje("Este enlace no sirve. Pide un QR nuevo en la tienda.");
      return;
    }
    fetch(`/api/estudiantes/qr-entrega?t=${encodeURIComponent(tok)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.error) {
          setEstado("error");
          setMensaje(j.error === "invalido" ? "Este QR no sirve. Pide uno nuevo en la tienda." : "No se pudo leer el QR. Intenta de nuevo.");
          return;
        }
        if (j.vencido) {
          setEstado("error");
          setMensaje("Este QR ya venció. Pide uno nuevo en la tienda.");
          return;
        }
        setInfo(j);
        if (!j.listo) setEstado("no_listo");
        else if (j.yaConfirmado) setEstado("ya");
        else setEstado("listo");
      })
      .catch(() => {
        setEstado("error");
        setMensaje("Sin conexión. Intenta de nuevo.");
      });
  }, []);

  async function confirmar() {
    setEnviando(true);
    try {
      const r = await fetch("/api/estudiantes/qr-entrega", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 410) {
        setEstado("error");
        setMensaje("Este QR ya venció. Pide uno nuevo en la tienda.");
      } else if (r.status === 409) {
        setEstado("no_listo");
      } else if (!r.ok || j.error) {
        setMensaje(j.error && j.error.startsWith("No se pudo") ? j.error : "No se pudo confirmar. Intenta de nuevo.");
      } else {
        setEstado(j.ya ? "ya" : "hecho");
      }
    } catch {
      setMensaje("Sin conexión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  const caja = { background: "#fff", border: "1px solid #dfe6ea", borderRadius: 14, padding: 18, maxWidth: 420, margin: "0 auto" };
  const texto = { color: "#5c6b78", fontSize: 14, lineHeight: 1.5, margin: "8px 0" };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f9", fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", color: "#1a2733" }}>
      <div style={{ background: "#f6ce46", color: "#2b2200", padding: "14px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".1em" }}>GUS DIVE CENTER</div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>Confirmar presupuesto</div>
      </div>
      <div style={{ padding: 16 }}>
        <div style={caja}>
          {estado === "cargando" && <div style={texto}>Revisando el QR…</div>}

          {estado === "listo" && (
            <>
              <b style={{ fontSize: 16 }}>{info.curso}</b>
              <div style={texto}>Curso del {info.fecha}</div>
              <div style={texto}>Al confirmar se anota el modelo de tu celular, el navegador y la hora. No se pide tu nombre ni tu número.</div>
              <button
                onClick={confirmar}
                disabled={enviando}
                style={{ width: "100%", marginTop: 8, border: 0, borderRadius: 10, padding: "12px 14px", fontWeight: 800, background: "#06324f", color: "#fff", fontSize: 15, cursor: "pointer" }}
              >
                {enviando ? "Confirmando…" : "Confirmo que lo recibí"}
              </button>
            </>
          )}

          {estado === "hecho" && (
            <>
              <b style={{ fontSize: 16 }}>Listo</b>
              <div style={texto}>
                Quedó anotado que recibiste el presupuesto de {info?.curso || "este curso"}. Ya puedes cerrar esta página.
              </div>
            </>
          )}

          {estado === "ya" && (
            <>
              <b style={{ fontSize: 16 }}>Ya estaba confirmado</b>
              <div style={texto}>Este presupuesto ya se había confirmado{info?.yaConfirmado ? ` el ${info.yaConfirmado}` : ""}. No hace falta hacer nada más.</div>
            </>
          )}

          {estado === "no_listo" && (
            <>
              <b style={{ fontSize: 16 }}>Todavía no está listo</b>
              <div style={texto}>El presupuesto todavía no está listo en la tienda. Pide que te den un QR nuevo cuando esté.</div>
            </>
          )}

          {estado === "error" && (
            <>
              <b style={{ fontSize: 16 }}>No se puede confirmar</b>
              <div style={texto}>{mensaje}</div>
            </>
          )}

          {estado !== "cargando" && estado !== "listo" && estado !== "error" && mensaje && <div style={texto}>{mensaje}</div>}
        </div>
      </div>
    </div>
  );
}
