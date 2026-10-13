"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Rediseñado (28-sep-2026, feedback en vivo, item 1): código antes que
// descripción (antes "nombre de la pieza"), sin la sección de
// "Descripción" (la renombrada cubre ese propósito), y ambos campos ahora
// obligatorios -- antes solo el nombre lo era y el código era opcional.
export default function NuevaPiezaForm() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!codigo.trim()) return setError("Escribe el código.");
    if (!nombre.trim()) return setError("Escribe la descripción del código.");

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { error: err } = await supabase.from("piezas_catalogo").insert({
      nombre: nombre.trim(),
      codigo: codigo.trim(),
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    });

    setGuardando(false);

    if (err) {
      console.error("Error creando código:", err);
      setError(err?.message ? `No se pudo guardar el código: ${err.message}` : "No se pudo guardar el código. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/piezas";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="codigo">
        Código <span className="req">*</span>
      </label>
      <input id="codigo" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: OR-2E-014" />

      <label htmlFor="nombre" style={{ marginTop: 12 }}>
        Descripción de código <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: O-ring 2da etapa" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar código"}
      </button>
    </form>
  );
}
