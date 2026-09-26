"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tipos de equipo a los que puede aplicar un servicio (item 21, pedido
// explícito: "que el servicio a realizar en registrar orden se filtre
// segun el tipo de equipo"). Mismos valores que TIPOS en
// equipos/[id]/editar/form-client.js (Tanques/Reguladores/BC/
// Computadora -- "Otro" no aplica aquí, un servicio "para cualquier
// equipo" simplemente se marca en los 4). Si no se marca ninguno, el
// servicio no aparece en ningún desplegable -- por eso se pide al menos
// uno al guardar.
const TIPOS_EQUIPO = ["Tanques", "Reguladores", "BC", "Computadora"];
const TIPO_EQUIPO_DISPLAY = { Tanques: "Tanque", Reguladores: "Regulador" };

export default function NuevoServicioForm() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function toggleTipo(t) {
    setTiposEquipo((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!nombre.trim()) return setError("Escribe el nombre del servicio.");
    if (tiposEquipo.length === 0) return setError("Marca al menos un tipo de equipo.");

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { error: err } = await supabase.from("servicios_catalogo").insert({
      nombre: nombre.trim(),
      tipos_equipo: tiposEquipo,
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    });

    setGuardando(false);

    if (err) {
      setError("No se pudo guardar el servicio. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/servicios";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre del servicio <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Limpieza" />

      <label style={{ marginTop: 14 }}>
        ¿Para qué equipo aplica? <span className="req">*</span>
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
        {TIPOS_EQUIPO.map((t) => (
          <label key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
            <input type="checkbox" checked={tiposEquipo.includes(t)} onChange={() => toggleTipo(t)} />
            {TIPO_EQUIPO_DISPLAY[t] || t}
          </label>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar servicio"}
      </button>
    </form>
  );
}
