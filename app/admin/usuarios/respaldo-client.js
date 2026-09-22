"use client";

import { useState } from "react";

// Descarga un respaldo en JSON con todas las tablas de datos (salidas,
// llenados, equipos, catálogo e historial) llamando a la ruta de servidor
// que junta todo con el cliente de servicio (sin restricciones de RLS).
export default function RespaldoDatos() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function handleClick() {
    setLoading(true);
    setMensaje(null);

    try {
      const res = await fetch("/api/admin/respaldo");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el respaldo.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const hoy = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-gus-dive-${hoy}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMensaje({ tipo: "ok", texto: "Respaldo descargado." });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || "No se pudo generar el respaldo." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="hint-text" style={{ marginBottom: 12, marginTop: 0 }}>
        Descarga un archivo JSON con todas las salidas, llenados, equipos,
        catálogo e historial de cambios registrados hasta ahora.
      </p>
      <button
        type="button"
        className="btn secondary"
        style={{ width: "auto" }}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "Generando..." : "Descargar respaldo"}
      </button>
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
    </div>
  );
}
