"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Formulario de llenado del Inicio del Operativo (V30) -- mismo registro
// que "Registrar llenado de tanque" (app/tanques/nuevo/form-client.js),
// pero siempre abierto en su pantalla: después de guardar se queda aquí,
// limpio para el siguiente, y la lista de "Llenados de hoy" y el resumen
// de la semana se actualizan solos.
export default function FormLlenadoOperativo({ userId, nombreUsuario }) {
  const router = useRouter();
  const supabase = createClient();

  const [cantidad, setCantidad] = useState(1);
  const [tipoGas, setTipoGas] = useState("Aire");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  function cambiar(delta) {
    setOk("");
    setCantidad((c) => Math.max(1, (Number(c) || 0) + delta));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");

    const n = Number(cantidad);
    if (!Number.isInteger(n) || n <= 0) {
      setError("Indica cuántos tanques llenaste.");
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.from("llenados_tanques").insert({
      user_id: userId,
      cantidad: n,
      tipo_gas: tipoGas,
      nota: nota.trim() || null,
      nombre_usuario_snapshot: nombreUsuario,
    });
    setLoading(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    setOk(`✓ Registrado: ${n} tanque${n === 1 ? "" : "s"} de ${tipoGas}.`);
    setCantidad(1);
    setNota("");
    router.refresh();
  }

  const botonPaso = { width: 52, marginTop: 0, fontSize: 22, padding: "8px 0", flexShrink: 0 };

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="section-title" style={{ marginTop: 0 }}>
        Registrar llenado de tanque
      </div>

      <label htmlFor="cantidad" style={{ marginTop: 4 }}>
        Cantidad de tanques <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" className="btn secondary" style={botonPaso} onClick={() => cambiar(-1)} aria-label="Uno menos">
          −
        </button>
        <input
          id="cantidad"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => {
            setOk("");
            setCantidad(e.target.value);
          }}
          style={{ textAlign: "center", fontSize: 20, fontWeight: 700 }}
        />
        <button type="button" className="btn secondary" style={botonPaso} onClick={() => cambiar(1)} aria-label="Uno más">
          +
        </button>
      </div>

      <label>
        Tipo de gas <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <div className="radio-pills">
        {["Aire", "Nitrox"].map((g) => (
          <label key={g}>
            <input type="radio" name="gas" checked={tipoGas === g} onChange={() => setTipoGas(g)} />
            {g}
          </label>
        ))}
      </div>

      <label htmlFor="nota">Nota</label>
      <textarea
        id="nota"
        rows={2}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Opcional"
      />

      {error && <div className="error-box">{error}</div>}
      {ok && <div className="success-box">{ok}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 14 }}>
        {loading ? "Guardando..." : "Registrar llenado"}
      </button>
    </form>
  );
}
