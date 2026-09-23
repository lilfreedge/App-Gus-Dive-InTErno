"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Otro"];

// Selector del equipo de un cliente (23-sep-2026, pedido explícito: "me
// interesa tener un historial de que se le ha hecho cada vez que ha ido
// un mismo equipo a la tienda"). Mismo patrón que SelectorCliente
// (buscar o crear ahí mismo), pero acotado al cliente ya elegido -- cada
// equipo (tipo + marca + modelo) le pertenece a un solo cliente.
//
// equipos: [{ id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo }]
// clienteId: cliente ya elegido en el formulario (si no hay, no se puede buscar/crear todavía)
// valor: id del equipo elegido (o "")
// onChange: (id) => void
// onEquipoCreado: (equipo) => void
export default function SelectorEquipoCliente({ equipos, clienteId, valor, onChange, onEquipoCreado }) {
  const supabase = createClient();
  const equiposDelCliente = equipos.filter((e) => e.cliente_id === clienteId);
  const seleccionado = equiposDelCliente.find((e) => e.id === valor);

  function etiqueta(e) {
    const tipo = e.tipo_equipo === "Otro" ? e.tipo_equipo_otro : e.tipo_equipo;
    const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
    return marcaModelo ? `${tipo} — ${marcaModelo}` : tipo;
  }

  const [texto, setTexto] = useState(seleccionado ? etiqueta(seleccionado) : "");
  const [abierto, setAbierto] = useState(false);
  const [creando, setCreando] = useState(false);
  const [tipoNuevo, setTipoNuevo] = useState("");
  const [tipoOtroNuevo, setTipoOtroNuevo] = useState("");
  const [marcaNueva, setMarcaNueva] = useState("");
  const [modeloNuevo, setModeloNuevo] = useState("");
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
    // Si cambia el cliente o el valor desde afuera, sincroniza el texto
    // y limpia la selección si ya no pertenece a este cliente.
    const actual = equipos.find((e) => e.id === valor && e.cliente_id === clienteId);
    setTexto(actual ? etiqueta(actual) : "");
    if (valor && !actual) onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, clienteId]);

  if (!clienteId) {
    return <div className="hint-text">Primero elige un cliente.</div>;
  }

  const q = texto.trim().toLowerCase();
  const filtrados =
    q.length === 0
      ? equiposDelCliente
      : equiposDelCliente.filter((e) => etiqueta(e).toLowerCase().includes(q));

  function elegir(e) {
    setTexto(etiqueta(e));
    onChange(e.id);
    setAbierto(false);
  }

  function onInputChange(v) {
    setTexto(v);
    setAbierto(true);
    onChange("");
  }

  function abrirCrear() {
    setTipoNuevo("");
    setTipoOtroNuevo("");
    setMarcaNueva("");
    setModeloNuevo("");
    setError("");
    setCreando(true);
    setAbierto(false);
  }

  async function guardarNuevo(e) {
    e.preventDefault();
    setError("");
    if (!tipoNuevo) return setError("Selecciona el tipo de equipo.");
    if (tipoNuevo === "Otro" && !tipoOtroNuevo.trim()) return setError("Especifica qué tipo de equipo es.");

    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };

    const { data, error: err } = await supabase
      .from("equipos_del_cliente")
      .insert({
        cliente_id: clienteId,
        tipo_equipo: tipoNuevo,
        tipo_equipo_otro: tipoNuevo === "Otro" ? tipoOtroNuevo.trim() : null,
        marca: marcaNueva.trim() || null,
        modelo: modeloNuevo.trim() || null,
        user_id: user?.id || null,
        nombre_usuario_snapshot: perfil?.full_name || null,
      })
      .select("id, cliente_id, tipo_equipo, tipo_equipo_otro, marca, modelo")
      .single();

    setGuardando(false);

    if (err || !data) {
      setError("No se pudo crear el equipo. Intenta de nuevo.");
      return;
    }

    onEquipoCreado(data);
    onChange(data.id);
    setTexto(etiqueta(data));
    setCreando(false);
  }

  if (creando) {
    return (
      <div className="card" style={{ background: "var(--superficie-suave)", padding: 14, marginTop: 4 }}>
        <div className="section-title" style={{ marginTop: 0 }}>
          Equipo nuevo
        </div>
        <label htmlFor="equipo_nuevo_tipo">
          Tipo de equipo <span className="req">*</span>
        </label>
        <select id="equipo_nuevo_tipo" value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)}>
          <option value="">Selecciona...</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {tipoNuevo === "Otro" && (
          <>
            <label htmlFor="equipo_nuevo_tipo_otro">
              ¿Qué tipo de equipo? <span className="req">*</span>
            </label>
            <input
              id="equipo_nuevo_tipo_otro"
              type="text"
              value={tipoOtroNuevo}
              onChange={(e) => setTipoOtroNuevo(e.target.value)}
            />
          </>
        )}
        <label htmlFor="equipo_nuevo_marca">Marca</label>
        <input id="equipo_nuevo_marca" type="text" value={marcaNueva} onChange={(e) => setMarcaNueva(e.target.value)} placeholder="Opcional" />
        <label htmlFor="equipo_nuevo_modelo">Modelo</label>
        <input id="equipo_nuevo_modelo" type="text" value={modeloNuevo} onChange={(e) => setModeloNuevo(e.target.value)} placeholder="Opcional" />
        {error && <div className="error-box">{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-primary" type="button" disabled={guardando} onClick={guardarNuevo} style={{ marginTop: 0 }}>
            {guardando ? "Guardando..." : "Guardar equipo"}
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
        placeholder="Escribe para buscar entre los equipos de este cliente..."
        value={texto}
        onChange={(e) => onInputChange(e.target.value)}
        onFocus={() => setAbierto(true)}
        autoComplete="off"
      />
      {abierto && (
        <div className="autocomplete-list">
          {filtrados.map((e) => (
            <div key={e.id} onMouseDown={() => elegir(e)}>
              {etiqueta(e)}
            </div>
          ))}
          <div onMouseDown={abrirCrear} style={{ fontWeight: 700, color: "var(--azul-claro)" }}>
            + Agregar equipo nuevo para este cliente
          </div>
        </div>
      )}
    </div>
  );
}
