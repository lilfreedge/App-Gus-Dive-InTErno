"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoArticuloForm() {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) return;

    setLoading(true);
    const { error } = await supabase
      .from("articulos")
      .insert({ nombre: nombre.trim() });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ese artículo ya existe en el catálogo.");
      } else {
        setError("No se pudo agregar. Intenta de nuevo.");
      }
      return;
    }

    setNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">Nuevo artículo</label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej. O-ring 2x110"
      />
      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Agregando..." : "Agregar al catálogo"}
      </button>
    </form>
  );
}
