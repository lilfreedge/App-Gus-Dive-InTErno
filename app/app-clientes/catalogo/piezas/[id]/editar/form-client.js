"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Editar/activar-desactivar una pieza del catálogo. No hay borrado --
// una pieza que ya no se usa se desactiva, nunca se elimina, para no
// dejar huérfanas las órdenes viejas que ya la usaron.
export default function EditarPiezaForm({ pieza }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(pieza.nombre);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre de la pieza.");

    setGuardando(true);
    const { error: err } = await supabase
      .from("piezas_catalogo")
      .update({ nombre: nombre.trim() })
      .eq("id", pieza.id);
    setGuardando(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/piezas";
  }

  async function toggleActivo() {
    setGuardando(true);
    const { error: err } = await supabase
      .from("piezas_catalogo")
      .update({ activo: !pieza.activo })
      .eq("id", pieza.id);
    setGuardando(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/piezas";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre de la pieza <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 0 }}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button className="btn secondary" type="button" disabled={guardando} onClick={toggleActivo} style={{ marginTop: 0 }}>
          {pieza.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </form>
  );
}
