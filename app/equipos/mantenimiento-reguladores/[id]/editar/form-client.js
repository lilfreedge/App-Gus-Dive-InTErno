"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarMantenimientoForm({ registro, reguladores }) {
  const router = useRouter();
  const supabase = createClient();

  const [reguladorId, setReguladorId] = useState(registro.regulador_id || "");
  const [limpiezaUltrasonido, setLimpiezaUltrasonido] = useState(!!registro.limpieza_ultrasonido);
  const [presionIntermedia, setPresionIntermedia] = useState(!!registro.presion_intermedia);
  const [oRingsAplica, setORingsAplica] = useState(!!registro.o_rings);
  const [oRings, setORings] = useState(registro.o_rings || "");
  const [nota, setNota] = useState(registro.detalle || "");
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
        limpieza_ultrasonido: limpiezaUltrasonido,
        presion_intermedia: presionIntermedia,
        o_rings: oRingsAplica ? oRings.trim() || null : null,
        detalle: nota.trim() || null,
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

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
