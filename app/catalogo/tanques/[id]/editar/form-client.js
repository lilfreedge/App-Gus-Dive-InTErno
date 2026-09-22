"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function EditarTanqueForm({ tanque }) {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState(tanque.codigo || "");
  const [descripcion, setDescripcion] = useState(tanque.descripcion || "");
  const [serie, setSerie] = useState(tanque.serie || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim();
    const descripcionLimpia = descripcion.trim();
    const serieLimpia = serie.trim();

    if (!codigoLimpio) return;

    setLoading(true);

    await registrarCambio(supabase, {
      tabla: "tanques_alquiler",
      registroId: tanque.id,
      accion: "editar",
      datosAnteriores: tanque,
    });

    const { error } = await supabase
      .from("tanques_alquiler")
      .update({ codigo: codigoLimpio, descripcion: descripcionLimpia || null, serie: serieLimpia || null })
      .eq("id", tanque.id);
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ya existe otro tanque con ese código.");
      } else {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
      return;
    }

    router.push("/catalogo/tanques");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="codigo" style={{ marginTop: 0 }}>
        Código <span className="req">*</span>
      </label>
      <input
        id="codigo"
        type="text"
        value={codigo}
        onChange={(e) => setCodigo(e.target.value)}
        placeholder="Ej: TQ-014"
      />

      <label htmlFor="descripcion">Descripción</label>
      <textarea
        id="descripcion"
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Tanque de aluminio 80 pies³"
      />

      <label htmlFor="serie">Número de serie</label>
      <input
        id="serie"
        type="text"
        value={serie}
        onChange={(e) => setSerie(e.target.value)}
        placeholder="Ej: AL80-2024-00123"
      />

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
