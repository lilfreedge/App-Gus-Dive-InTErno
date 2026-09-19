"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoMantenimientoForm({ userId, nombreUsuario, reguladores }) {
  const router = useRouter();
  const supabase = createClient();

  const [reguladorId, setReguladorId] = useState(reguladores[0]?.id || "");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!reguladorId) {
      setError("Selecciona un regulador.");
      return;
    }

    if (!detalle.trim()) {
      setError("Describe el mantenimiento realizado.");
      return;
    }

    const regulador = reguladores.find((r) => r.id === reguladorId);

    setLoading(true);

    const { error } = await supabase.from("mantenimientos_reguladores").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      regulador_id: reguladorId,
      regulador_codigo_snapshot: regulador?.codigo || null,
      detalle: detalle.trim(),
    });

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/equipos/mantenimiento-reguladores");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="regulador">
        Regulador <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <select
        id="regulador"
        required
        value={reguladorId}
        onChange={(e) => setReguladorId(e.target.value)}
      >
        {reguladores.length === 0 && <option value="">No hay reguladores activos</option>}
        {reguladores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.codigo}
            {r.descripcion ? ` — ${r.descripcion}` : ""}
          </option>
        ))}
      </select>

      <label htmlFor="detalle">
        Detalle del mantenimiento <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <textarea
        id="detalle"
        required
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder="Qué se le hizo al regulador"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading || reguladores.length === 0}>
        {loading ? "Guardando..." : "Registrar mantenimiento"}
      </button>
    </form>
  );
}
