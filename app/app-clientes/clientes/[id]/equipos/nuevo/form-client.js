"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tipoEquipoDisplay } from "@/lib/tipo-equipo";

const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Otro"];
const CON_SERIE = ["Reguladores", "Tanques", "Computadora"];

let siguienteId = 1;
function filaVacia() {
  return { key: siguienteId++, tipo_equipo: "", tipo_equipo_otro: "", marca: "", modelo: "", serie: "" };
}

// Carga varios equipos de una sola vez para un cliente ya existente
// (pedido explícito, 23-sep-2026). Cada fila sigue las mismas reglas que
// "+ Agregar equipo nuevo para este cliente" en SelectorEquipoCliente
// (mismo componente inline, pero ahí solo se podía cargar uno a la vez):
// Tanques pide Fabricante + No. Serie (ni marca ni modelo); Reguladores
// y Computadora piden Marca, Modelo y No. Serie; BC y Otro solo Marca y
// Modelo.
export default function AgregarEquiposForm({ clienteId }) {
  const supabase = createClient();
  const [filas, setFilas] = useState([filaVacia()]);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  function actualizarFila(key, campo, valor) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, [campo]: valor } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [...prev, filaVacia()]);
  }

  function quitarFila(key) {
    setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.key !== key) : prev));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    for (const f of filas) {
      if (!f.tipo_equipo) return setError("Selecciona el tipo de equipo en cada fila.");
      if (f.tipo_equipo === "Otro" && !f.tipo_equipo_otro.trim()) {
        return setError("Especifica qué tipo de equipo es en cada fila marcada como \"Otro\".");
      }
    }

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const registros = filas.map((f) => ({
      cliente_id: clienteId,
      tipo_equipo: f.tipo_equipo,
      tipo_equipo_otro: f.tipo_equipo === "Otro" ? f.tipo_equipo_otro.trim() : null,
      marca: f.marca.trim() || null,
      modelo: f.tipo_equipo === "Tanques" ? null : f.modelo.trim() || null,
      serie: CON_SERIE.includes(f.tipo_equipo) ? f.serie.trim() || null : null,
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    }));

    const { error: err } = await supabase.from("equipos_del_cliente").insert(registros);

    setGuardando(false);

    if (err) {
      console.error("Error guardando equipos:", err);
      setError(err?.message ? `No se pudieron guardar los equipos: ${err.message}` : "No se pudieron guardar los equipos. Intenta de nuevo.");
      return;
    }

    // Navegación dura: se vuelve a la ficha del cliente, de la que se
    // vino hace un momento -- igual que en Actualizar seguimiento, así
    // se evita mostrar la lista de equipos desactualizada por el caché
    // de rutas de Next.
    window.location.href = `/app-clientes/clientes/${clienteId}`;
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      {filas.map((f, i) => (
        <div
          key={f.key}
          style={{
            background: "var(--superficie-suave)",
            borderRadius: 10,
            padding: 14,
            marginTop: i === 0 ? 0 : 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title" style={{ marginTop: 0 }}>
              Equipo {i + 1}
            </div>
            {filas.length > 1 && (
              <button
                type="button"
                className="btn secondary"
                onClick={() => quitarFila(f.key)}
                style={{ marginTop: 0, padding: "4px 12px", fontSize: 12.5 }}
              >
                Quitar
              </button>
            )}
          </div>

          <label htmlFor={`tipo_${f.key}`}>
            Tipo de equipo <span className="req">*</span>
          </label>
          <select
            id={`tipo_${f.key}`}
            value={f.tipo_equipo}
            onChange={(e) => actualizarFila(f.key, "tipo_equipo", e.target.value)}
          >
            <option value="">Selecciona...</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>{tipoEquipoDisplay(t)}</option>
            ))}
          </select>

          {f.tipo_equipo === "Otro" && (
            <>
              <label htmlFor={`tipo_otro_${f.key}`}>
                ¿Qué tipo de equipo? <span className="req">*</span>
              </label>
              <input
                id={`tipo_otro_${f.key}`}
                type="text"
                value={f.tipo_equipo_otro}
                onChange={(e) => actualizarFila(f.key, "tipo_equipo_otro", e.target.value)}
              />
            </>
          )}

          {f.tipo_equipo === "Tanques" ? (
            <>
              <label htmlFor={`marca_${f.key}`}>Fabricante</label>
              <input
                id={`marca_${f.key}`}
                type="text"
                value={f.marca}
                onChange={(e) => actualizarFila(f.key, "marca", e.target.value)}
                placeholder="Opcional"
              />
              <label htmlFor={`serie_${f.key}`}>No. Serie</label>
              <input
                id={`serie_${f.key}`}
                type="text"
                value={f.serie}
                onChange={(e) => actualizarFila(f.key, "serie", e.target.value)}
                placeholder="Opcional"
              />
            </>
          ) : (
            f.tipo_equipo && (
              <>
                <label htmlFor={`marca_${f.key}`}>Marca</label>
                <input
                  id={`marca_${f.key}`}
                  type="text"
                  value={f.marca}
                  onChange={(e) => actualizarFila(f.key, "marca", e.target.value)}
                  placeholder="Opcional"
                />
                <label htmlFor={`modelo_${f.key}`}>Modelo</label>
                <input
                  id={`modelo_${f.key}`}
                  type="text"
                  value={f.modelo}
                  onChange={(e) => actualizarFila(f.key, "modelo", e.target.value)}
                  placeholder="Opcional"
                />
                {CON_SERIE.includes(f.tipo_equipo) && (
                  <>
                    <label htmlFor={`serie_${f.key}`}>No. Serie</label>
                    <input
                      id={`serie_${f.key}`}
                      type="text"
                      value={f.serie}
                      onChange={(e) => actualizarFila(f.key, "serie", e.target.value)}
                      placeholder="Opcional"
                    />
                  </>
                )}
              </>
            )
          )}
        </div>
      ))}

      <button
        type="button"
        className="btn secondary"
        onClick={agregarFila}
        style={{ marginTop: 14, width: "100%" }}
      >
        + Agregar otro equipo
      </button>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : filas.length > 1 ? `Guardar ${filas.length} equipos` : "Guardar equipo"}
      </button>
    </form>
  );
}
