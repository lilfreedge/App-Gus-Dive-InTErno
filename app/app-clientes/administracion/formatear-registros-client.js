"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Formatear registros" para App Clientes (pedido explícito, 23-sep-2026:
// "crea un boton de formatear, similar al de app interno, pero que sea
// para este app"). A diferencia de App Interno (todo-o-nada), acá el
// usuario pidió elegir exactamente qué se borra -- primero como 2
// opciones fijas ("Solo las órdenes" / "Completamente todo"), y al
// preguntarle qué entraba en "completamente todo" amplió el pedido:
// "Lo que me interesa que se formatee es: todo del app, pero que uno
// pueda especificar que es lo que va a borrar especificamente. Porque
// quizas me pueda interesar quedarme con la base de datos de clientes."
// -- así que quedó un selector de categorías independientes, no un
// choque fijo de 2 opciones.
//
// Única regla que no se puede evitar (dependencia de llave foránea, ver
// migration_24.sql): las Órdenes están ligadas a Clientes/Equipos, así
// que marcar "Clientes y sus equipos" también borra las Órdenes aunque
// esa casilla no se marque aparte -- se refleja marcando y
// deshabilitando esa casilla sola, y se explica en la primera
// confirmación antes de ejecutar.
const CATEGORIAS = [
  {
    clave: "ordenes",
    label: "Órdenes",
    detalle: "Borra todas las órdenes y reinicia su numeración (folio) desde 1.",
  },
  {
    clave: "piezas",
    label: "Piezas y repuestos",
    detalle: "Borra el catálogo de piezas y repuestos (Base de datos).",
  },
  {
    clave: "servicios",
    label: "Servicios",
    detalle: "Borra el catálogo de servicios (Base de datos).",
  },
  {
    clave: "clientes",
    label: "Clientes y sus equipos",
    detalle:
      "Borra todos los clientes y los equipos registrados a su nombre. Esto también borra las Órdenes, porque cada orden está ligada a un cliente/equipo.",
  },
];

export default function FormatearRegistrosClientes() {
  const router = useRouter();
  const supabase = createClient();
  const [marcadas, setMarcadas] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function toggle(clave, valor) {
    setMarcadas((prev) => {
      const next = { ...prev, [clave]: valor };
      // "Clientes y sus equipos" arrastra "Órdenes" -- se marca y se
      // deshabilita sola mientras "Clientes" siga marcada.
      if (clave === "clientes" && valor) next.ordenes = true;
      return next;
    });
  }

  async function handleClick() {
    const seleccionadas = CATEGORIAS.filter((c) => marcadas[c.clave]);
    if (seleccionadas.length === 0) {
      setMensaje({ tipo: "error", texto: "Selecciona al menos una categoría para borrar." });
      return;
    }

    const listado = seleccionadas.map((c) => c.label).join(", ");
    if (
      !window.confirm(
        `Vas a borrar PERMANENTEMENTE: ${listado}.\n\nEsto no se puede deshacer. ¿Seguro que quieres continuar?`
      )
    )
      return;
    // Mismos textos que App Interno (pedido explícito ahí: "no
    // cambiarlos") -- se reusan tal cual para mantener el mismo tono.
    if (!window.confirm("¿Tú ta seguro broth? Se borra to'")) return;
    if (!window.confirm("¿SEGURO???????")) return;
    if (!window.confirm("Tato")) return;

    setLoading(true);
    setMensaje(null);

    const { error } = await supabase.rpc("formatear_registros_clientes", {
      p_borrar_ordenes: !!marcadas.ordenes,
      p_borrar_piezas: !!marcadas.piezas,
      p_borrar_servicios: !!marcadas.servicios,
      p_borrar_clientes: !!marcadas.clientes,
    });

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo formatear: " + error.message });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Registros formateados." });
    setMarcadas({});
    router.refresh();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--texto-suave)", marginBottom: 12, marginTop: 0 }}>
        Elige qué quieres borrar permanentemente. No se puede deshacer.
      </p>
      {CATEGORIAS.map((c) => (
        <label
          key={c.clave}
          className="check-label"
          style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}
        >
          <input
            type="checkbox"
            checked={!!marcadas[c.clave]}
            disabled={loading || (c.clave === "ordenes" && !!marcadas.clientes)}
            onChange={(e) => toggle(c.clave, e.target.checked)}
            style={{ width: "auto", marginTop: 3 }}
          />
          <span>
            <b>{c.label}</b>
            <div style={{ fontSize: 12, color: "var(--texto-suave)" }}>{c.detalle}</div>
          </span>
        </label>
      ))}
      <button
        type="button"
        className="btn danger"
        style={{ width: "auto", marginTop: 6 }}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "Formateando..." : "Formatear registros"}
      </button>
      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
