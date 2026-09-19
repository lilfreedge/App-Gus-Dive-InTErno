"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import { proximoMantenimiento } from "@/lib/fechas";

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

    // Mejor esfuerzo: actualiza el próximo mantenimiento del regulador
    // (+8 meses). No bloquea la navegación si falla.
    try {
      await supabase
        .from("reguladores_alquiler")
        .update({ proximo_mantenimiento: proximoMantenimiento(new Date().toISOString()) })
        .eq("id", reguladorId);
    } catch (e) {
      console.error("No se pudo actualizar proximo_mantenimiento del regulador:", e);
    }

    router.push("/equipos/mantenimiento-reguladores");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="regulador">
        Regulador <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <SelectorBusqueda
        items={reguladores}
        valor={reguladorId}
        onChange={setReguladorId}
        placeholder="Escribe para buscar regulador por código..."
        vacio="No hay reguladores activos"
      />

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
