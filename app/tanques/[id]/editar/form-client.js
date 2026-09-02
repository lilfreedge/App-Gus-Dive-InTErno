"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarLlenadoForm({ registro }) {
  const router = useRouter();
  const supabase = createClient();

  const [cantidad, setCantidad] = useState(String(registro.cantidad));
  const [tipoGas, setTipoGas] = useState(registro.tipo_gas || "Aire");
  const [nota, setNota] = useState(registro.nota || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cantidad || Number(cantidad) <= 0) return;

    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "llenados_tanques",
      registroId: registro.id,
      accion: "editar",
      datosAnteriores: registro,
    });

    const { error } = await supabase
      .from("llenados_tanques")
      .update({
        cantidad: Number(cantidad),
        tipo_gas: tipoGas,
        nota: nota.trim() || null,
      })
      .eq("id", registro.id);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/tanques");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="cantidad">Cantidad de tanques</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <label>Tipo de gas</label>
      <div className="radio-pills">
        <label>
          <input
            type="radio"
            name="gas"
            checked={tipoGas === "Aire"}
            onChange={() => setTipoGas("Aire")}
          />
          Aire
        </label>
        <label>
          <input
            type="radio"
            name="gas"
            checked={tipoGas === "Nitrox"}
            onChange={() => setTipoGas("Nitrox")}
          />
          Nitrox
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
