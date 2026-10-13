"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoLlenadoForm({ userId, nombreUsuario }) {
  const router = useRouter();
  const supabase = createClient();

  const [cantidad, setCantidad] = useState("1");
  const [tipoGas, setTipoGas] = useState("Aire");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cantidad || Number(cantidad) <= 0) {
      setError("Indica cuántos tanques llenaste.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("llenados_tanques").insert({
      user_id: userId,
      cantidad: Number(cantidad),
      tipo_gas: tipoGas,
      nota: nota.trim() || null,
      nombre_usuario_snapshot: nombreUsuario,
    });

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
      <label htmlFor="cantidad">
        Cantidad de tanques <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <label>
        Tipo de gas <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
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
        {loading ? "Guardando..." : "Registrar llenado"}
      </button>
    </form>
  );
}
