"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditarCodigoForm({ articulo }) {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState(articulo.nombre || "");
  const [descripcion, setDescripcion] = useState(articulo.descripcion || "");
  const [error, setError] = useState("");
  const [descripcionError, setDescripcionError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nombreLimpio = nombre.trim();
    const descripcionLimpia = descripcion.trim();

    if (!nombreLimpio) return;

    if (!descripcionLimpia) {
      setDescripcionError(true);
      return;
    }
    setDescripcionError(false);

    setLoading(true);
    const { error } = await supabase
      .from("articulos")
      .update({ nombre: nombreLimpio, descripcion: descripcionLimpia })
      .eq("id", articulo.id);
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ya existe otro código con ese nombre.");
      } else {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
      return;
    }

    router.push("/catalogo");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre" style={{ marginTop: 0 }}>
        Código <span className="req">*</span>
      </label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ej: R014"
      />

      <div className={descripcionError ? "field-error" : ""}>
        <label htmlFor="descripcion">
          Descripción <span className="req">*</span>
        </label>
        <textarea
          id="descripcion"
          rows={2}
          value={descripcion}
          onChange={(e) => {
            setDescripcion(e.target.value);
            if (descripcionError && e.target.value.trim()) setDescripcionError(false);
          }}
          placeholder="Ej: Manguera de baja presión, conexión estándar"
        />
        {descripcionError && <div className="error-msg">⚠ Este campo es obligatorio</div>}
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
