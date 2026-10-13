"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Selector de cliente con búsqueda (por nombre o teléfono) -- a
// diferencia de SelectorBusqueda (que solo permite elegir de la lista),
// este además deja crear un cliente nuevo ahí mismo si no existe
// todavía, pedido explícito del usuario (23-sep-2026): "si vas a
// registrar una orden y es de un cliente que no esta en el sistema
// todavia, pues que de la opcion de crearlo ahi mismo".
//
// clientes: [{ id, nombre, telefono }]
// valor: id seleccionado (o "")
// onChange: (id) => void
// onClienteCreado: (cliente) => void -- para que el padre agregue el
// cliente nuevo a su lista en memoria sin tener que recargar la página.
// puedeCrear: si es false (permiso granular equipos_clientes_agregar_cliente
// faltante, item 15), no se muestra la opción de crear -- solo se puede
// elegir entre los clientes ya existentes.
// puedeEditar: si es true (permiso equipos_clientes_editar_cliente, feedback
// en vivo 29-sep-2026, item 8: "agregame en registrar una opcion de editar
// cliente justo al lado de 'agregar cliente'"), con un cliente ya elegido
// se muestra un link "Editar cliente" que abre su ficha de edición en una
// pestaña nueva -- así no se pierde el resto del formulario que se esté
// llenando (por ejemplo, Registrar orden).
export default function SelectorCliente({ clientes, valor, onChange, onClienteCreado, puedeCrear = true, puedeEditar = false }) {
  const supabase = createClient();
  const seleccionado = clientes.find((c) => c.id === valor);
  const [texto, setTexto] = useState(seleccionado?.nombre || "");
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const actual = clientes.find((c) => c.id === valor);
    setTexto(actual?.nombre || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const q = texto.trim().toLowerCase();
  const filtrados =
    q.length === 0
      ? clientes
      : clientes.filter(
          (c) => c.nombre?.toLowerCase().includes(q) || c.telefono?.toLowerCase().includes(q)
        );

  function elegir(c) {
    setTexto(c.nombre);
    onChange(c.id);
    setAbierto(false);
  }

  function onInputChange(v) {
    setTexto(v);
    setAbierto(true);
    const coincideExacto = clientes.find((c) => c.nombre?.toLowerCase() === v.trim().toLowerCase());
    onChange(coincideExacto ? coincideExacto.id : "");
  }

  function abrirCrear() {
    setNombreNuevo(texto.trim());
    setTelefonoNuevo("");
    setError("");
    setCreando(true);
    setAbierto(false);
  }

  async function guardarNuevo(e) {
    e.preventDefault();
    setError("");
    if (!nombreNuevo.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }
    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { data, error: err } = await supabase
      .from("clientes_equipos")
      .insert({
        nombre: nombreNuevo.trim(),
        telefono: telefonoNuevo.trim() || null,
        user_id: user?.id || null,
        nombre_usuario_snapshot: perfil?.full_name || null,
      })
      .select("id, nombre, telefono")
      .single();

    setGuardando(false);

    if (err || !data) {
      setError("No se pudo crear el cliente. Intenta de nuevo.");
      return;
    }

    onClienteCreado(data);
    onChange(data.id);
    setTexto(data.nombre);
    setCreando(false);
  }

  if (creando) {
    return (
      <div className="card" style={{ background: "var(--superficie-suave)", padding: 14, marginTop: 4 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Cliente nuevo
        </div>
        <label htmlFor="cliente_nuevo_nombre">
          Nombre <span className="req">*</span>
        </label>
        <input
          id="cliente_nuevo_nombre"
          type="text"
          value={nombreNuevo}
          onChange={(e) => setNombreNuevo(e.target.value)}
        />
        <label htmlFor="cliente_nuevo_telefono">Teléfono</label>
        <input
          id="cliente_nuevo_telefono"
          type="text"
          value={telefonoNuevo}
          onChange={(e) => setTelefonoNuevo(e.target.value)}
          placeholder="Opcional"
        />
        {error && <div className="error-box">{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" type="button" disabled={guardando} onClick={guardarNuevo} style={{ marginTop: 0 }}>
            {guardando ? "Guardando..." : "Guardar cliente"}
          </button>
          <button className="btn secondary" type="button" disabled={guardando} onClick={() => setCreando(false)} style={{ marginTop: 0 }}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        type="text"
        placeholder="Escribe para buscar por nombre o teléfono..."
        value={texto}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setAbierto(true)}
        autoComplete="off"
      />
      {puedeEditar && seleccionado && (
        <a
          href={`/app-clientes/clientes/${seleccionado.id}/editar`}
          target="_blank"
          rel="noopener noreferrer"
          className="hint-text"
          style={{ display: "inline-block", marginTop: 4, fontWeight: 600, color: "var(--azul-claro)" }}
        >
          Editar cliente
        </a>
      )}
      {abierto && (
        <div className="autocomplete-list">
          {filtrados.map((c) => (
            <div key={c.id} onMouseDown={() => elegir(c)}>
              {c.nombre}
              {c.telefono ? ` — ${c.telefono}` : ""}
            </div>
          ))}
          {puedeCrear && (
            <div
              onMouseDown={abrirCrear}
              style={{ fontWeight: 700, color: "var(--azul-claro)" }}
            >
              + Registrar {texto.trim() ? `"${texto.trim()}"` : ""} como cliente nuevo
            </div>
          )}
        </div>
      )}
    </div>
  );
}
