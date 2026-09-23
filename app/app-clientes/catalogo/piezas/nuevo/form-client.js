"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NuevaPiezaForm() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre de la pieza.");

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { error: err } = await supabase.from("piezas_catalogo").insert({
      nombre: nombre.trim(),
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    });

    setGuardando(false);

    if (err) {
      console.error("Error creando pieza:", err);
      setError(err?.message ? `No se pudo guardar la pieza: ${err.message}` : "No se pudo guardar la pieza. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/piezas";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre de la pieza <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: O-ring 2ra etapa" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar pieza"}
      </button>
    </form>
  );
}
