"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { proximaInspeccion } from "@/lib/fechas";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NuevoTanqueForm() {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [serie, setSerie] = useState("");
  const [ultimaInspeccion, setUltimaInspeccion] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim();
    const descripcionLimpia = descripcion.trim();
    const serieLimpia = serie.trim();

    if (!codigoLimpio) return;

    // Ítem 3 (backlog 22-sep-2026): si se indica la última inspección visual,
    // la próxima se calcula desde esa fecha; si se deja vacío, se usa hoy
    // como base -- así el tanque ya arranca con su fecha de vencimiento
    // correcta en vez de esperar a que se registre una inspección desde la app.
    const baseInspeccion = ultimaInspeccion || hoyISO();

    setLoading(true);
    const { error } = await supabase.from("tanques_alquiler").insert({
      codigo: codigoLimpio,
      descripcion: descripcionLimpia || null,
      serie: serieLimpia || null,
      proxima_inspeccion: proximaInspeccion(baseInspeccion),
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ese código ya existe en el catálogo de tanques.");
      } else {
        setError("No se pudo agregar. Intenta de nuevo.");
      }
      return;
    }

    setCodigo("");
    setDescripcion("");
    setSerie("");
    setUltimaInspeccion("");
    setGuardado(true);
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

      <label htmlFor="ultima_inspeccion">Última inspección visual</label>
      <input
        id="ultima_inspeccion"
        type="date"
        value={ultimaInspeccion}
        onChange={(e) => setUltimaInspeccion(e.target.value)}
      />
      <p className="hint-text" style={{ marginTop: 4 }}>
        Opcional. Si la dejas vacía, la próxima inspección se calcula desde hoy (+12 meses).
      </p>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar tanque"}
      </button>
      {guardado && <div className="success-box">✓ Tanque agregado al catálogo.</div>}
    </form>
  );
}
