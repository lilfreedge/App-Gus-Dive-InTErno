"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { tipoEquipoDisplay } from "@/lib/tipo-equipo";

const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Otro"];
const CON_SERIE = ["Reguladores", "Tanques", "Computadora"];

// Mismo patrón que "Editar compresor" (app/equipos/compresores/[id]/editar):
// formulario precargado, registrarCambio con los datos de ANTES justo
// antes del update, para que quede en el historial de ediciones de
// Administración (sección "Historial de ediciones de Equipos", aparte de
// la de órdenes). Mismos campos y reglas condicionales que "+ Agregar
// equipo" (Tanques pide Fabricante + No. Serie, sin marca/modelo;
// Reguladores y Computadora piden Marca, Modelo y No. Serie; BC y Otro
// solo Marca y Modelo).
export default function EditarEquipoForm({ equipo }) {
  const supabase = createClient();

  const [tipoEquipo, setTipoEquipo] = useState(equipo.tipo_equipo || "");
  const [tipoEquipoOtro, setTipoEquipoOtro] = useState(equipo.tipo_equipo_otro || "");
  const [marca, setMarca] = useState(equipo.marca || "");
  const [modelo, setModelo] = useState(equipo.modelo || "");
  const [serie, setSerie] = useState(equipo.serie || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!tipoEquipo) {
      setError("Selecciona el tipo de equipo.");
      return;
    }
    if (tipoEquipo === "Otro" && !tipoEquipoOtro.trim()) {
      setError('Especifica qué tipo de equipo es.');
      return;
    }

    setGuardando(true);

    // Queda en Administración > Historial de ediciones de Equipos, con
    // los datos de ANTES de este cambio.
    await registrarCambio(supabase, {
      tabla: "equipos_del_cliente",
      registroId: equipo.id,
      accion: "editar",
      datosAnteriores: equipo,
    });

    const cambios = {
      tipo_equipo: tipoEquipo,
      tipo_equipo_otro: tipoEquipo === "Otro" ? tipoEquipoOtro.trim() : null,
      marca: marca.trim() || null,
      modelo: tipoEquipo === "Tanques" ? null : modelo.trim() || null,
      serie: CON_SERIE.includes(tipoEquipo) ? serie.trim() || null : null,
    };

    const { error: err } = await supabase.from("equipos_del_cliente").update(cambios).eq("id", equipo.id);

    setGuardando(false);

    if (err) {
      setError(err?.message ? `No se pudo guardar: ${err.message}` : "No se pudo guardar. Intenta de nuevo.");
      return;
    }

    // Navegación dura: se vuelve a la ficha del equipo, de la que se vino
    // hace un momento -- mismo patrón que el resto de la app, para
    // evitar mostrar datos desactualizados por el caché de rutas de Next.
    window.location.href = `/app-clientes/equipos/${equipo.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="tipo_equipo" style={{ marginTop: 0 }}>
        Tipo de equipo <span className="req">*</span>
      </label>
      <select id="tipo_equipo" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)}>
        <option value="">Selecciona...</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>{tipoEquipoDisplay(t)}</option>
        ))}
      </select>

      {tipoEquipo === "Otro" && (
        <>
          <label htmlFor="tipo_equipo_otro">
            ¿Qué tipo de equipo? <span className="req">*</span>
          </label>
          <input
            id="tipo_equipo_otro"
            type="text"
            value={tipoEquipoOtro}
            onChange={(e) => setTipoEquipoOtro(e.target.value)}
          />
        </>
      )}

      {tipoEquipo === "Tanques" ? (
        <>
          <label htmlFor="marca">Fabricante</label>
          <input id="marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Opcional" />
          <label htmlFor="serie">No. Serie</label>
          <input id="serie" type="text" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Opcional" />
        </>
      ) : (
        tipoEquipo && (
          <>
            <label htmlFor="marca">Marca</label>
            <input id="marca" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Opcional" />
            <label htmlFor="modelo">Modelo</label>
            <input id="modelo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Opcional" />
            {CON_SERIE.includes(tipoEquipo) && (
              <>
                <label htmlFor="serie">No. Serie</label>
                <input id="serie" type="text" value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="Opcional" />
              </>
            )}
          </>
        )
      )}

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
