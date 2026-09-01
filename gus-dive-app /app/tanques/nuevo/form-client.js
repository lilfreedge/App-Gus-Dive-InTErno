"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoLlenadoForm({ userId }) {
  const router = useRouter();
  const supabase = createClient();

  const [cantidad, setCantidad] = useState("1");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cantidad) {
      setError("Indica cuántos tanques llenaste.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("llenados_tanques").insert({
      user_id: userId,
      cantidad: Number(cantidad),
      nota: nota.trim() || null,
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
      <label htmlFor="cantidad">Cantidad de tanques llenados</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <label htmlFor="nota">Nota adicional</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej. tipo de gas, para qué fue (opcional)"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar llenado"}
      </button>
    </form>
  );
}
