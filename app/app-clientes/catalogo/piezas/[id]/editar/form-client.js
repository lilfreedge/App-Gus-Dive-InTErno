"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// v56: tipos_equipo opcional -- a qué tipo(s) de equipo pertenece el
// código (pedido explícito: "que me permita poner a que tipo de equipo
// pertenece ese código"). Sin marcar nada, el código sigue apareciendo
// para todos los equipos en Seguimiento > Códigos a cobrar.
const TIPOS_EQUIPO = ["Tanques", "Reguladores", "BC", "Computadora", "Compresor"];

// Editar/activar-desactivar/borrar una pieza del catálogo. Rediseñado
// (28-sep-2026, feedback en vivo, item 1): código antes que descripción
// (antes "nombre de la pieza"), sin la sección de "Descripción", ambos
// campos ahora obligatorios, y con borrado real (antes solo se podía
// desactivar) -- confirmación de un segundo click antes de borrar, mismo
// espíritu que el resto de la app (ver confirmarHold en el wizard de
// Seguimiento), en vez de un cuadro de diálogo nativo del navegador.
export default function EditarPiezaForm({ pieza }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState(pieza.nombre);
  const [codigo, setCodigo] = useState(pieza.codigo || "");
  const [tiposEquipo, setTiposEquipo] = useState(Array.isArray(pieza.tipos_equipo) ? pieza.tipos_equipo : []);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);

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
    const { error: err } = await supabase
      .from("piezas_catalogo")
      .update({
        nombre: nombre.trim(),
        codigo: codigo.trim(),
        tipos_equipo: tiposEquipo.length > 0 ? tiposEquipo : null,
      })
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

  async function borrarCodigo() {
    if (!confirmandoBorrar) {
      setConfirmandoBorrar(true);
      return;
    }
    setGuardando(true);
    setError("");
    const { error: err } = await supabase.from("piezas_catalogo").delete().eq("id", pieza.id);
    setGuardando(false);

    if (err) {
      setConfirmandoBorrar(false);
      setError("No se pudo borrar. Intenta de nuevo.");
      return;
    }

    window.location.href = "/app-clientes/catalogo/piezas";
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="codigo">
        Código <span className="req">*</span>
      </label>
      <input id="codigo" type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} />

      <label htmlFor="nombre" style={{ marginTop: 12 }}>
        Descripción de código <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

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

      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 0 }}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        <button className="btn secondary" type="button" disabled={guardando} onClick={toggleActivo} style={{ marginTop: 0 }}>
          {pieza.activo ? "Desactivar" : "Activar"}
        </button>
      </div>

      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--borde)" }}>
        {confirmandoBorrar && (
          <div className="hint-text" style={{ marginBottom: 8, color: "var(--rojo)" }}>
            ¿Seguro que quieres borrar este código? No se puede deshacer.
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn secondary"
            disabled={guardando}
            onClick={borrarCodigo}
            style={{ marginTop: 0, color: "var(--rojo)" }}
          >
            {guardando && confirmandoBorrar ? "Borrando..." : confirmandoBorrar ? "Sí, borrar código" : "Borrar código"}
          </button>
          {confirmandoBorrar && (
            <button
              type="button"
              className="btn secondary"
              disabled={guardando}
              onClick={() => setConfirmandoBorrar(false)}
              style={{ marginTop: 0 }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
