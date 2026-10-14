"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

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

    window.location.href = `/app-clientes/clientes/${cliente.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="nombre" style={{ marginTop: 0 }}>
        Nombre <span className="req">*</span>
      </label>
      <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label htmlFor="telefono">Número de contacto</label>
      <input
        id="telefono"
        type="text"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        placeholder="Teléfono o WhatsApp (opcional)"
      />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={guardando} style={{ marginTop: 20 }}>
        {guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
