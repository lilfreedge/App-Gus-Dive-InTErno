"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

// Mismo patrón que "Editar equipo" (equipos/[id]/editar/form-client.js):
// formulario precargado, registrarCambio con los datos de ANTES justo
// antes del update, para que quede en Historial con antes/después (tabla
// clientes_equipos). Solo nombre y teléfono -- las órdenes y equipos del
// cliente se editan cada uno por su lado.
export default function EditarClienteForm({ cliente }) {
  const supabase = createClient();

  const [nombre, setNombre] = useState(cliente.nombre || "");
  const [telefono, setTelefono] = useState(cliente.telefono || "");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!nombre.trim()) {
      setError("Escribe el nombre del cliente.");
      return;
    }

    setGuardando(true);

    const cambios = {
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
    };

    await registrarCambio(supabase, {
      tabla: "clientes_equipos",
      registroId: cliente.id,
      accion: "editar",
      datosAnteriores: cliente,
      datosNuevos: cambios,
    });

    const { error: err } = await supabase.from("clientes_equipos").update(cambios).eq("id", cliente.id);

    setGuardando(false);

    if (err) {
      setError(err?.message ? `No se pudo guardar: ${err.message}` : "No se pudo guardar. Intenta de nuevo.");
      return;
    }

    // Navegación dura (mismo patrón que el resto de la app) -- se vuelve
    // a la ficha del cliente, ya actualizada.
    window.location.href = `/app-clientes/clientes/${cliente.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre" style={{ marginTop: 0 }}>
        Nombre <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="telefono">Teléfono</label>
      <input id="telefono" type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Opcional" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
