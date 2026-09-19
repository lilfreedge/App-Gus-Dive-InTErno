"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarMantenimientoForm({ registro, reguladores }) {
  const router = useRouter();
  const supabase = createClient();

  const [reguladorId, setReguladorId] = useState(registro.regulador_id || "");
  const [detalle, setDetalle] = useState(registro.detalle || "");
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

    await registrarCambio(supabase, {
      tabla: "mantenimientos_reguladores",
      registroId: registro.id,
      accion: "editar",
      datosAnteriores: registro,
    });

    const { error } = await supabase
      .from("mantenimientos_reguladores")
      .update({
        regulador_id: reguladorId,
        regulador_codigo_snapshot: regulador?.codigo || registro.regulador_codigo_snapshot,
        detalle: detalle.trim(),
      })
      .eq("id", registro.id);

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
      <label htmlFor="regulador">Regulador</label>
      <select
        id="regulador"
        required
        value={reguladorId}
        onChange={(e) => setReguladorId(e.target.value)}
      >
        {!reguladores.some((r) => r.id === reguladorId) && registro.regulador_codigo_snapshot && (
          <option value={reguladorId}>{registro.regulador_codigo_snapshot} (inactivo)</option>
        )}
        {reguladores.map((r) => (
          <option key={r.id} value={r.id}>
            {r.codigo}
            {r.descripcion ? ` — ${r.descripcion}` : ""}
          </option>
        ))}
      </select>

      <label htmlFor="detalle">Detalle del mantenimiento</label>
      <textarea
        id="detalle"
        required
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        placeholder="Qué se le hizo al regulador"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
