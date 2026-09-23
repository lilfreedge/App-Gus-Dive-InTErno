"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Editar/activar-desactivar un servicio del catálogo. No hay borrado --
// un servicio que ya no se ofrece se desactiva (deja de salir en el
// desplegable de "Registrar orden"), nunca se elimina, para no dejar
// huérfanas las órdenes viejas que ya lo usaron.
export default function EditarServicioForm({ servicio }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(servicio.nombre);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre del servicio.");

    setGuardando(true);
    const { error: err } = await supabase
      .from("servicios_catalogo")
      .update({ nombre: nombre.trim() })
      .eq("id", servicio.id);
    setGuardando(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo";
  }

  async function toggleActivo() {
    setGuardando(true);
    const { error: err } = await supabase
      .from("servicios_catalogo")
      .update({ activo: !servicio.activo })
      .eq("id", servicio.id);
    setGuardando(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre del servicio <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 0 }}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button className="btn secondary" type="button" disabled={guardando} onClick={toggleActivo} style={{ marginTop: 0 }}>
          {servicio.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </form>
  );
}
