"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarLlenadoForm({ registro }) {
  const router = useRouter();
  const supabase = createClient();

  const [cantidad, setCantidad] = useState(String(registro.cantidad));
  const [nota, setNota] = useState(registro.nota || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!cantidad) return;

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
      <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
