"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import { proximaInspeccion } from "@/lib/fechas";

function filaVacia(tanques) {
  return { tanqueId: tanques[0]?.id || "", resultado: "Aprobado", nota: "" };
}

// Permite registrar varias inspecciones de una vez (p. ej. una ronda
// de inspección de varios tanques el mismo día), sin tener que volver
// a entrar al formulario por cada una. Con una sola fila se comporta
// igual que antes.
export default function NuevaInspeccionForm({ userId, nombreUsuario, tanques }) {
  const router = useRouter();
  const supabase = createClient();

  const [filas, setFilas] = useState([filaVacia(tanques)]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function actualizarFila(i, cambios) {
    setFilas((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...cambios } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia(tanques)]);
  }

  function quitarFila(i) {
    setFilas((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (filas.some((f) => !f.tanqueId)) {
      setError("Selecciona un tanque en cada inspección.");
      return;
    }

    setLoading(true);

    const registros = filas.map((f) => {
      const tanque = tanques.find((t) => t.id === f.tanqueId);
      return {
        user_id: userId,
        nombre_usuario_snapshot: nombreUsuario,
        tanque_id: f.tanqueId,
        tanque_codigo_snapshot: tanque?.codigo || null,
        resultado: f.resultado,
        nota: f.nota.trim() || null,
      };
    });

    const { error } = await supabase.from("inspecciones_visuales").insert(registros);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    // Mejor esfuerzo: actualiza la próxima inspección (+1 año) de cada
    // tanque distinto que se haya inspeccionado. No bloquea la
    // navegación si falla.
    try {
      const tanqueIdsUnicos = [...new Set(filas.map((f) => f.tanqueId))];
      await Promise.all(
        tanqueIdsUnicos.map((id) =>
          supabase
            .from("tanques_alquiler")
            .update({ proxima_inspeccion: proximaInspeccion(new Date().toISOString()) })
            .eq("id", id)
        )
      );
    } catch (e) {
      console.error("No se pudo actualizar proxima_inspeccion del tanque:", e);
    }

    router.push("/equipos/inspeccion-visual");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {filas.map((fila, i) => (
        <div
          key={i}
          style={i > 0 ? { marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--borde)" } : undefined}
        >
          {filas.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>
                Inspección {i + 1}
              </span>
              <button
                type="button"
                onClick={() => quitarFila(i)}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: "none",
                  background: "none",
                  color: "var(--rojo)",
                  cursor: "pointer",
                }}
              >
                Quitar
              </button>
            </div>
          )}

          <label htmlFor={`tanque-${i}`}>
            Tanque <span style={{ color: "var(--rojo)" }}>*</span>
          </label>
          <SelectorBusqueda
            items={tanques}
            valor={fila.tanqueId}
            onChange={(v) => actualizarFila(i, { tanqueId: v })}
            placeholder="Escribe para buscar tanque por código..."
            vacio="No hay tanques activos"
          />

          <label>
            Resultado <span style={{ color: "var(--rojo)" }}>*</span>
          </label>
          <div className="radio-pills">
            <label>
              <input
                type="radio"
                name={`resultado-${i}`}
                checked={fila.resultado === "Aprobado"}
                onChange={() => actualizarFila(i, { resultado: "Aprobado" })}
              />
              Aprobado
            </label>
            <label>
              <input
                type="radio"
                name={`resultado-${i}`}
                checked={fila.resultado === "Rechazado"}
                onChange={() => actualizarFila(i, { resultado: "Rechazado" })}
              />
              Rechazado
            </label>
          </div>

          <label htmlFor={`nota-${i}`}>Nota</label>
          <textarea
            id={`nota-${i}`}
            value={fila.nota}
            onChange={(e) => actualizarFila(i, { nota: e.target.value })}
            placeholder="Cualquier detalle extra (opcional)"
          />
        </div>
      ))}

      <button
        type="button"
        className="btn secondary"
        style={{ marginTop: 18 }}
        onClick={agregarFila}
        disabled={tanques.length === 0}
      >
        + Agregar otro tanque
      </button>

      {error && <div className="error-box">{error}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={loading || tanques.length === 0}
        style={{ marginTop: 16 }}
      >
        {loading
          ? "Guardando..."
          : filas.length > 1
          ? `Registrar ${filas.length} inspecciones`
          : "Registrar inspección"}
      </button>
    </form>
  );
}
