"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarSalidaForm({ registro, articulos, admins }) {
  const router = useRouter();
  const supabase = createClient();

  const [articuloId, setArticuloId] = useState(registro.articulo_id || "");
  const [cantidad, setCantidad] = useState(String(registro.cantidad));
  const [motivo, setMotivo] = useState(registro.motivo || "");
  const [autorizadoPorId, setAutorizadoPorId] = useState(registro.autorizado_por_id || "");
  const [nota, setNota] = useState(registro.nota || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!articuloId || !motivo.trim() || !cantidad) {
      setError("Completa artículo, cantidad y motivo.");
      return;
    }

    const articulo = articulos.find((a) => a.id === articuloId);
    const admin = admins.find((a) => a.id === autorizadoPorId);

    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "salidas",
      registroId: registro.id,
      accion: "editar",
      datosAnteriores: registro,
    });

    const { error } = await supabase
      .from("salidas")
      .update({
        articulo_id: articuloId,
        articulo: articulo?.nombre || registro.articulo,
        cantidad: Number(cantidad),
        motivo: motivo.trim(),
        autorizado_por_id: autorizadoPorId || null,
        autorizado_por: admin?.full_name || null,
        nota: nota.trim() || null,
      })
      .eq("id", registro.id);

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push("/salidas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="articulo">Artículo / pieza</label>
      <select
        id="articulo"
        required
        value={articuloId}
        onChange={(e) => setArticuloId(e.target.value)}
      >
        <option value="">Selecciona un artículo...</option>
        {articulos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nombre}
          </option>
        ))}
      </select>

      <label htmlFor="cantidad">Cantidad</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
      />

      <label htmlFor="motivo">Motivo / para qué es</label>
      <input
        id="motivo"
        type="text"
        required
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
      />

      <label htmlFor="autorizadoPor">Autorizado por</label>
      <select
        id="autorizadoPor"
        value={autorizadoPorId}
        onChange={(e) => setAutorizadoPorId(e.target.value)}
      >
        <option value="">Sin especificar</option>
        {admins.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </select>

      <label htmlFor="nota">Nota adicional</label>
      <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
