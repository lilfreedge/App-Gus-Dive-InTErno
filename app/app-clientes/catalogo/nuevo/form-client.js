"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NuevoServicioForm() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre del servicio.");

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { error: err } = await supabase.from("servicios_catalogo").insert({
      nombre: nombre.trim(),
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    });

    setGuardando(false);

    if (err) {
      setError("No se pudo guardar el servicio. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre del servicio <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Limpieza" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar servicio"}
      </button>
    </form>
  );
}
