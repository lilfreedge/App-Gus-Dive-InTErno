"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevaSalidaForm({ userId }) {
  const router = useRouter();
  const supabase = createClient();

  const [articulo, setArticulo] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [autorizadoPor, setAutorizadoPor] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!articulo.trim() || !motivo.trim() || !cantidad) {
      setError("Completa artículo, cantidad y motivo.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("salidas").insert({
      user_id: userId,
      articulo: articulo.trim(),
      cantidad: Number(cantidad),
      motivo: motivo.trim(),
      autorizado_por: autorizadoPor.trim() || null,
      nota: nota.trim() || null,
    });

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/salidas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="articulo">Artículo / pieza</label>
      <input
        id="articulo"
        type="text"
        required
        value={articulo}
        onChange={(e) => setArticulo(e.target.value)}
        placeholder="Ej. O-ring, regulador, manguera..."
      />

      <label htmlFor="cantidad">Cantidad</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <label htmlFor="motivo">Motivo / para qué es</label>
      <input
        id="motivo"
        type="text"
        required
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej. reparación de equipo de tienda"
      />

      <label htmlFor="autorizadoPor">Autorizado por</label>
      <input
        id="autorizadoPor"
        type="text"
        value={autorizadoPor}
        onChange={(e) => setAutorizadoPor(e.target.value)}
        placeholder="Nombre de quien autorizó (opcional)"
      />

      <label htmlFor="nota">Nota adicional</label>
      <textarea
        id="nota"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Cualquier detalle extra (opcional)"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar salida"}
      </button>
    </form>
  );
}
