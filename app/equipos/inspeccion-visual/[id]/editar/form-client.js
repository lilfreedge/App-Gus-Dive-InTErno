"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarInspeccionForm({ registro, tanques }) {
  const router = useRouter();
  const supabase = createClient();

  const [tanqueId, setTanqueId] = useState(registro.tanque_id || "");
  const [resultado, setResultado] = useState(registro.resultado || "Aprobado");
  const [nota, setNota] = useState(registro.nota || "");
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

    await registrarCambio(supabase, {
      tabla: "inspecciones_visuales",
      registroId: registro.id,
      accion: "editar",
      datosAnteriores: registro,
    });

    const { error } = await supabase
      .from("inspecciones_visuales")
      .update({
        tanque_id: tanqueId,
        tanque_codigo_snapshot: tanque?.codigo || registro.tanque_codigo_snapshot,
        resultado,
        nota: nota.trim() || null,
      })
      .eq("id", registro.id);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/equipos/inspeccion-visual");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="tanque">Tanque</label>
      <select id="tanque" required value={tanqueId} onChange={(e) => setTanqueId(e.target.value)}>
        {!tanques.some((t) => t.id === tanqueId) && registro.tanque_codigo_snapshot && (
          <option value={tanqueId}>{registro.tanque_codigo_snapshot} (inactivo)</option>
        )}
        {tanques.map((t) => (
          <option key={t.id} value={t.id}>
            {t.codigo}
            {t.descripcion ? ` — ${t.descripcion}` : ""}
          </option>
        ))}
      </select>

      <label>Resultado</label>
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

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
