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
  const [limpiezaUltrasonido, setLimpiezaUltrasonido] = useState(false);
  const [presionIntermedia, setPresionIntermedia] = useState(false);
  const [oRingsAplica, setORingsAplica] = useState(false);
  const [oRings, setORings] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!reguladorId) {
      setError("Selecciona un regulador.");
      return;
    }

    const regulador = reguladores.find((r) => r.id === reguladorId);

    setLoading(true);

    const { error } = await supabase.from("mantenimientos_reguladores").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      regulador_id: reguladorId,
      regulador_codigo_snapshot: regulador?.codigo || null,
      limpieza_ultrasonido: limpiezaUltrasonido,
      presion_intermedia: presionIntermedia,
      o_rings: oRingsAplica ? oRings.trim() || null : null,
      detalle: nota.trim() || null,
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

      <label>Limpieza ultrasonido</label>
      <div className="radio-pills">
        <label>
          <input
            type="radio"
            name="limpieza_ultrasonido"
            checked={!limpiezaUltrasonido}
            onChange={() => setLimpiezaUltrasonido(false)}
          />
          No
        </label>
        <label>
          <input
            type="radio"
            name="limpieza_ultrasonido"
            checked={limpiezaUltrasonido}
            onChange={() => setLimpiezaUltrasonido(true)}
          />
          Sí
        </label>
      </div>

      <label>Presión intermedia</label>
      <div className="radio-pills">
        <label>
          <input
            type="radio"
            name="presion_intermedia"
            checked={!presionIntermedia}
            onChange={() => setPresionIntermedia(false)}
          />
          No
        </label>
        <label>
          <input
            type="radio"
            name="presion_intermedia"
            checked={presionIntermedia}
            onChange={() => setPresionIntermedia(true)}
          />
          Sí
        </label>
      </div>

      <label>O-rings</label>
      <div className="radio-pills">
        <label>
          <input
            type="radio"
            name="o_rings_aplica"
            checked={!oRingsAplica}
            onChange={() => setORingsAplica(false)}
          />
          Ninguno
        </label>
        <label>
          <input
            type="radio"
            name="o_rings_aplica"
            checked={oRingsAplica}
            onChange={() => setORingsAplica(true)}
          />
          Especificar
        </label>
      </div>
      {oRingsAplica && (
        <input
          type="text"
          value={oRings}
          onChange={(e) => setORings(e.target.value)}
          placeholder="Ej: O-ring de primera etapa"
          style={{ marginTop: 8 }}
        />
      )}

      <label htmlFor="nota">Nota</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading || reguladores.length === 0}>
        {loading ? "Guardando..." : "Registrar mantenimiento"}
      </button>
    </form>
  );
}
