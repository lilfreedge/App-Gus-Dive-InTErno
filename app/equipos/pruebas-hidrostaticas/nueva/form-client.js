"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import { hoyLocalISO } from "@/lib/fechas";

let siguienteClave = 1;
function filaVacia(fecha) {
  return { clave: siguienteClave++, tanqueId: "", fecha: fecha || "", resultado: "Aprobado", nota: "" };
}

// Mismo formulario que Inspección visual (varias filas de una vez), con la
// FECHA DE LA PRUEBA por fila: por default hoy, pero se puede poner una
// fecha pasada para cargar la última prueba real de los tanques que ya
// existen. Una fila nueva copia la fecha de la fila anterior (lo normal es
// que una tanda de tanques vuelva de la prueba el mismo día).
// No hace falta actualizar el tanque desde aquí: la próxima prueba
// (+5 años) la pone la base de datos (migration_53.sql).
export default function NuevaPruebaHidrostaticaForm({ userId, nombreUsuario, tanques }) {
  const router = useRouter();
  const supabase = createClient();

  const [filas, setFilas] = useState(() => [filaVacia()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // "Hoy" del dispositivo -- se pone después de cargar (no en el servidor,
  // que está en UTC) como fecha por default de las filas sin fecha.
  const [hoy, setHoy] = useState("");

  useEffect(() => {
    const h = hoyLocalISO();
    setHoy(h);
    setFilas((prev) => prev.map((f) => (f.fecha ? f : { ...f, fecha: h })));
  }, []);

  function actualizarFila(clave, cambios) {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia(prev[prev.length - 1]?.fecha || hoy)]);
  }

  function quitarFila(clave) {
    setFilas((prev) => prev.filter((f) => f.clave !== clave));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (filas.some((f) => !f.tanqueId)) {
      setError("Selecciona un tanque en cada prueba.");
      return;
    }
    if (filas.some((f) => !f.fecha)) {
      setError("Pon la fecha de la prueba en cada fila.");
      return;
    }
    if (filas.some((f) => f.fecha > hoyLocalISO())) {
      setError("La fecha de la prueba no puede ser en el futuro.");
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
        fecha_prueba: f.fecha,
        resultado: f.resultado,
        nota: f.nota.trim() || null,
      };
    });

    const { error } = await supabase.from("pruebas_hidrostaticas").insert(registros);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/equipos/pruebas-hidrostaticas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {filas.map((fila, i) => (
        <div
          key={fila.clave}
          style={i > 0 ? { marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--borde)" } : undefined}
        >
          {filas.length > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="section-title" style={{ marginTop: 0, marginBottom: 0 }}>
                Prueba {i + 1}
              </span>
              <button
                type="button"
                onClick={() => quitarFila(fila.clave)}
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

          <label>
            Tanque <span style={{ color: "var(--rojo)" }}>*</span>
          </label>
          <SelectorBusqueda
            items={tanques}
            valor={fila.tanqueId}
            onChange={(v) => actualizarFila(fila.clave, { tanqueId: v })}
            placeholder="Escribe para buscar tanque por código..."
            vacio="No hay tanques activos"
          />

          <label htmlFor={`fecha-${fila.clave}`}>
            Fecha de la prueba <span style={{ color: "var(--rojo)" }}>*</span>
          </label>
          <input
            id={`fecha-${fila.clave}`}
            type="date"
            max={hoy || undefined}
            value={fila.fecha}
            onChange={(e) => actualizarFila(fila.clave, { fecha: e.target.value })}
          />

          <label>
            Resultado <span style={{ color: "var(--rojo)" }}>*</span>
          </label>
          <div className="radio-pills">
            <label>
              <input
                type="radio"
                name={`resultado-${fila.clave}`}
                checked={fila.resultado === "Aprobado"}
                onChange={() => actualizarFila(fila.clave, { resultado: "Aprobado" })}
              />
              Aprobado
            </label>
            <label>
              <input
                type="radio"
                name={`resultado-${fila.clave}`}
                checked={fila.resultado === "Rechazado"}
                onChange={() => actualizarFila(fila.clave, { resultado: "Rechazado" })}
              />
              Rechazado
            </label>
          </div>

          <label htmlFor={`nota-${fila.clave}`}>Nota</label>
          <textarea
            id={`nota-${fila.clave}`}
            value={fila.nota}
            onChange={(e) => actualizarFila(fila.clave, { nota: e.target.value })}
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
          ? `Registrar ${filas.length} pruebas`
          : "Registrar prueba"}
      </button>
    </form>
  );
}
