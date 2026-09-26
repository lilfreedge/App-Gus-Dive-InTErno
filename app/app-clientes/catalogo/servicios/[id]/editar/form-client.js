"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Tipos de equipo a los que puede aplicar un servicio (item 21) --
// mismos valores que en nuevo/form-client.js.
const TIPOS_EQUIPO = ["Tanques", "Reguladores", "BC", "Computadora"];
const TIPO_EQUIPO_DISPLAY = { Tanques: "Tanque", Reguladores: "Regulador" };

// Editar/activar-desactivar un servicio del catálogo. No hay borrado --
// un servicio que ya no se ofrece se desactiva (deja de salir en el
// desplegable de "Registrar orden"), nunca se elimina, para no dejar
// huérfanas las órdenes viejas que ya lo usaron.
//
// `protegido` (item 29, pedido explícito: "aqui haz que prueba
// hidrostatica sea ineditable", confirmado "29. si" que también cubre
// desactivar) -- para "Prueba Hidrostática" se bloquea el nombre Y el
// botón de Desactivar, porque el resto de la app detecta este servicio
// por su nombre (ver esServicioHidrostatica en lib/ordenes-estado.js) y
// depende de que siga activo.
export default function EditarServicioForm({ servicio, protegido = false }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(servicio.nombre);
  const [tiposEquipo, setTiposEquipo] = useState(servicio.tipos_equipo || []);
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
    const { error: err } = await supabase
      .from("servicios_catalogo")
      .update({ nombre: protegido ? servicio.nombre : nombre.trim(), tipos_equipo: tiposEquipo })
      .eq("id", servicio.id);
    setGuardando(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/servicios";
  }

  async function toggleActivo() {
    if (protegido) return;
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

    window.location.href = "/app-clientes/catalogo/servicios";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre">
        Nombre del servicio <span className="req">*</span>
      </label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        disabled={protegido}
      />
      {protegido && (
        <div className="hint-text" style={{ marginTop: 4 }}>
          Este servicio no se puede renombrar ni desactivar -- el resto de la app depende de que se llame así.
        </div>
      )}

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

      <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 0 }}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={guardando || protegido}
          onClick={toggleActivo}
          title={protegido ? "Este servicio no se puede desactivar" : undefined}
          style={{ marginTop: 0 }}
        >
          {servicio.activo ? "Desactivar" : "Activar"}
        </button>
      </div>
    </form>
  );
}
