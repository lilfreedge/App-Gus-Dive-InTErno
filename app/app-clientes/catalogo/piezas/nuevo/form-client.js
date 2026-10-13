"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// v56: tipos_equipo opcional -- a qué tipo(s) de equipo pertenece el
// código (pedido explícito: "que me permita poner a que tipo de equipo
// pertenece ese código"). Sin marcar nada, el código sigue apareciendo
// para todos los equipos en Seguimiento > Códigos a cobrar.
const TIPOS_EQUIPO = ["Tanques", "Reguladores", "BC", "Computadora", "Compresor"];

// Rediseñado (28-sep-2026, feedback en vivo, item 1): código antes que
// descripción (antes "nombre de la pieza"), sin la sección de
// "Descripción" (la renombrada cubre ese propósito), y ambos campos ahora
// obligatorios -- antes solo el nombre lo era y el código era opcional.
export default function NuevaPiezaForm() {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tiposEquipo, setTiposEquipo] = useState([]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function toggleTipo(tipo) {
    setTiposEquipo((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  }

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
      tipos_equipo: tiposEquipo.length > 0 ? tiposEquipo : null,
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

      <label style={{ marginTop: 16 }}>Tipo de equipo (opcional)</label>
      <div className="hint-text" style={{ marginTop: 0, marginBottom: 8 }}>
        Marca para qué tipo(s) de equipo aplica este código. Sin marcar nada, aparece en todos los equipos.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TIPOS_EQUIPO.map((tipo) => (
          <label key={tipo} className="check-label" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500 }}>
            <input
              type="checkbox"
              checked={tiposEquipo.includes(tipo)}
              onChange={() => toggleTipo(tipo)}
              style={{ width: "auto" }}
            />
            {tipo}
          </label>
        ))}
      </div>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar código"}
      </button>
    </form>
  );
}
