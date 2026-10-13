"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

// Normaliza o_rings desde la BD (puede ser jsonb array, string legacy, o null)
function parsearORings(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((r) =>
    typeof r === "object" && r !== null
      ? { descripcion: r.descripcion || "", parte: r.parte || "" }
      : { descripcion: String(r), parte: "" }
  );
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsearORings(parsed);
    } catch {}
    return raw.trim() ? [{ descripcion: raw.trim(), parte: "" }] : [];
  }
  return [];
}

export default function EditarMantenimientoForm({ registro, reguladores }) {
  const router = useRouter();
  const supabase = createClient();

  const [reguladorId, setReguladorId] = useState(registro.regulador_id || "");
  const [limpiezaUltrasonido, setLimpiezaUltrasonido] = useState(!!registro.limpieza_ultrasonido);
  const [presionIntermedia, setPresionIntermedia] = useState(
    typeof registro.presion_intermedia === "string" ? registro.presion_intermedia : ""
  );
  const [oRings, setORings] = useState(parsearORings(registro.o_rings));
  const [oRingDesc, setORingDesc] = useState("");
  const [oRingParte, setORingParte] = useState("");
  const [nota, setNota] = useState(registro.detalle || "");
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

    const cambios = {
      regulador_id: reguladorId,
      regulador_codigo_snapshot: regulador?.codigo || registro.regulador_codigo_snapshot,
      limpieza_ultrasonido: limpiezaUltrasonido,
      presion_intermedia: presionIntermedia.trim() || null,
      o_rings: oRings.length > 0 ? oRings : null,
      detalle: nota.trim() || null,
    };

    await registrarCambio(supabase, {
      tabla: "mantenimientos_reguladores",
      registroId: registro.id,
      accion: "editar",
      datosAnteriores: registro,
      datosNuevos: cambios,
    });

    const { error } = await supabase.from("mantenimientos_reguladores").update(cambios).eq("id", registro.id);

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

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
