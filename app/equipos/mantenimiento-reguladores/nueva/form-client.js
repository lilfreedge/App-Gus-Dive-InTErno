"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";

export default function NuevoMantenimientoForm({ userId, nombreUsuario, reguladores }) {
  const router = useRouter();
  const supabase = createClient();

  const [reguladorId, setReguladorId] = useState(reguladores[0]?.id || "");
  const [limpiezaUltrasonido, setLimpiezaUltrasonido] = useState(false);
  const [presionIntermedia, setPresionIntermedia] = useState("");
  // o_rings: array de {descripcion, parte}
  const [oRings, setORings] = useState([]);
  const [oRingDesc, setORingDesc] = useState("");
  const [oRingParte, setORingParte] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function agregarORing() {
    const desc = oRingDesc.trim();
    if (!desc) return;
    setORings((prev) => [...prev, { descripcion: desc, parte: oRingParte.trim() }]);
    setORingDesc("");
    setORingParte("");
  }

  function quitarORing(idx) {
    setORings((prev) => prev.filter((_, i) => i !== idx));
  }

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
      presion_intermedia: presionIntermedia.trim() || null,
      o_rings: oRings.length > 0 ? oRings : null,
      detalle: nota.trim() || null,
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

      <label htmlFor="presion_intermedia">Presión intermedia</label>
      <input
        id="presion_intermedia"
        type="text"
        value={presionIntermedia}
        onChange={(e) => setPresionIntermedia(e.target.value)}
        placeholder="Ej: 135 PSI (dejar vacío si no aplica)"
      />

      <label>O-rings utilizados</label>
      {oRings.length > 0 && (
        <ul style={{ margin: "4px 0 10px", paddingLeft: 20, fontSize: 14 }}>
          {oRings.map((r, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <span>
                <strong>{r.descripcion}</strong>
                {r.parte ? ` — ${r.parte}` : ""}
              </span>
              <button
                type="button"
                onClick={() => quitarORing(i)}
                style={{
                  marginLeft: 8,
                  background: "none",
                  border: "none",
                  color: "var(--rojo)",
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          value={oRingDesc}
          onChange={(e) => setORingDesc(e.target.value)}
          placeholder="O-ring (ej: kit 1ª etapa)"
          style={{ flex: "2 1 140px" }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarORing(); } }}
        />
        <input
          type="text"
          value={oRingParte}
          onChange={(e) => setORingParte(e.target.value)}
          placeholder="Parte del regulador (opcional)"
          style={{ flex: "3 1 180px" }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregarORing(); } }}
        />
        <button
          type="button"
          className="btn"
          onClick={agregarORing}
          style={{ flexShrink: 0 }}
        >
          + Agregar
        </button>
      </div>

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
