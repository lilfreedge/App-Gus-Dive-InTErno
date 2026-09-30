"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { tipoEquipoDisplay } from "@/lib/tipo-equipo";
import { serieYaRegistrada, mensajeSerieDuplicada } from "@/lib/equipos";
import DetalleComponentesRegulador from "@/components/DetalleComponentesRegulador";

// "Compresor" agregado (pedido explícito, ronda grande de feedback,
// 27-sep-2026) -- mismo patrón que los demás tipos, lleva serie.
const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Compresor", "Otro"];
const CON_SERIE = ["Reguladores", "Tanques", "Computadora", "Compresor"];
const TAMANOS_TANQUE = ["60 cf", "80 cf", "100 cf", "120 cf"];
const MATERIALES_TANQUE = ["Aluminio", "Acero"];

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
  // Tamaño/Material del Tanque, ahora editables (feedback en vivo,
  // 30-sep-2026, pedido explícito: "ok nitido pero pon que se pueda
  // editar") -- revierte la decisión de v48 de dejarlos fijos ("es
  // imposible que cambie", pedido original del 29-sep-2026).
  const [tamano, setTamano] = useState(equipo.tamano || "");
  const [material, setMaterial] = useState(equipo.material || "");
  // Detalle de componentes -- solo Reguladores (28-sep-2026, pedido
  // explícito: "al momento de registar regulador, que pida para llenar
  // los componenstes: 1ra etapa/2da etapa/Octopus/Manómetro/Manguera de
  // BC"). Ver lib/regulador-detalle.js.
  const [detalleComponentes, setDetalleComponentes] = useState(equipo.regulador_componentes_detalle || {});
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

    // Seriales repetidos prohibidos (feedback en vivo, 29-sep-2026, pedido
    // explícito) -- se excluye este mismo equipo de la búsqueda (editar sin
    // tocar la serie no debe chocar consigo mismo). Ver lib/equipos.js.
    const serieLimpia = CON_SERIE.includes(tipoEquipo) ? serie.trim() : "";
    if (serieLimpia) {
      setGuardando(true);
      const existente = await serieYaRegistrada(supabase, serieLimpia, { excluirId: equipo.id });
      if (existente) {
        setGuardando(false);
        setError(await mensajeSerieDuplicada(supabase, existente));
        return;
      }
      setGuardando(false);
    }

    setGuardando(true);

    const cambios = {
      tipo_equipo: tipoEquipo,
      tipo_equipo_otro: tipoEquipo === "Otro" ? tipoEquipoOtro.trim() : null,
      marca: marca.trim() || null,
      modelo: tipoEquipo === "Tanques" ? null : modelo.trim() || null,
      serie: CON_SERIE.includes(tipoEquipo) ? serie.trim() || null : null,
      tamano: tipoEquipo === "Tanques" ? tamano || null : null,
      material: tipoEquipo === "Tanques" ? material || null : null,
      regulador_componentes_detalle: tipoEquipo === "Reguladores" ? detalleComponentes : null,
    };

    // Queda en Administración > Historial de ediciones de Equipos, con los
    // datos de ANTES y de DESPUÉS de este cambio (item 20, pedido
    // explícito: "que en las ediciones aparezca el before and after").
    await registrarCambio(supabase, {
      tabla: "equipos_del_cliente",
      registroId: equipo.id,
      accion: "editar",
      datosAnteriores: equipo,
      datosNuevos: cambios,
    });

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
          {/* Tamaño/Material, editables (feedback en vivo, 30-sep-2026,
              pedido explícito: "ok nitido pero pon que se pueda editar") --
              habían quedado de solo lectura en v48 ("es imposible que
              cambie", pedido original del 29-sep-2026), pero el usuario
              pidió poder corregirlos después de todo. Mismas opciones fijas
              que al crear el tanque. */}
          <label htmlFor="tamano">Tamaño</label>
          <select id="tamano" value={tamano} onChange={(e) => setTamano(e.target.value)}>
            <option value="">Selecciona...</option>
            {TAMANOS_TANQUE.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label htmlFor="material">Material</label>
          <select id="material" value={material} onChange={(e) => setMaterial(e.target.value)}>
            <option value="">Selecciona...</option>
            {MATERIALES_TANQUE.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
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

      {tipoEquipo === "Reguladores" && (
        <DetalleComponentesRegulador
          detalle={detalleComponentes}
          onChange={setDetalleComponentes}
          idPrefix="editar"
          marca={marca}
          modelo={modelo}
        />
      )}

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
