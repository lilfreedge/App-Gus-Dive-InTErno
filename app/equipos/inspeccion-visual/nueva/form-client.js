"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import { proximaInspeccion } from "@/lib/fechas";

export default function NuevaInspeccionForm({ userId, nombreUsuario, tanques }) {
  const router = useRouter();
  const supabase = createClient();

  const [tanqueId, setTanqueId] = useState(tanques[0]?.id || "");
  const [resultado, setResultado] = useState("Aprobado");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!tanqueId) {
      setError("Selecciona un tanque.");
      return;
    }

    const tanque = tanques.find((t) => t.id === tanqueId);

    setLoading(true);

    const { error } = await supabase.from("inspecciones_visuales").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      tanque_id: tanqueId,
      tanque_codigo_snapshot: tanque?.codigo || null,
      resultado,
      nota: nota.trim() || null,
    });

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    // Mejor esfuerzo: actualiza la próxima inspección del tanque
    // (+1 año). No bloquea la navegación si falla.
    try {
      await supabase
        .from("tanques_alquiler")
        .update({ proxima_inspeccion: proximaInspeccion(new Date().toISOString()) })
        .eq("id", tanqueId);
    } catch (e) {
      console.error("No se pudo actualizar proxima_inspeccion del tanque:", e);
    }

    router.push("/equipos/inspeccion-visual");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="tanque">
        Tanque <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <SelectorBusqueda
        items={tanques}
        valor={tanqueId}
        onChange={setTanqueId}
        placeholder="Escribe para buscar tanque por código..."
        vacio="No hay tanques activos"
      />

      <label>
        Resultado <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <div className="radio-pills">
        <label>
          <input
            type="radio"
            name="resultado"
            checked={resultado === "Aprobado"}
            onChange={() => setResultado("Aprobado")}
          />
          Aprobado
        </label>
        <label>
          <input
            type="radio"
            name="resultado"
            checked={resultado === "Rechazado"}
            onChange={() => setResultado("Rechazado")}
          />
          Rechazado
        </label>
      </div>

      <label htmlFor="nota">Nota</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading || tanques.length === 0}>
        {loading ? "Guardando..." : "Registrar inspección"}
      </button>
    </form>
  );
}
