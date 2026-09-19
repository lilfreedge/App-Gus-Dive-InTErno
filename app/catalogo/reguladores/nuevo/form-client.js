"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoReguladorForm() {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [serie, setSerie] = useState("");
  const [etapas, setEtapas] = useState("");
  const [octopus, setOctopus] = useState(false);
  const [manometro, setManometro] = useState(false);
  const [manguera_bc, setMangueraBc] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim();
    const descripcionLimpia = descripcion.trim();

    if (!codigoLimpio) return;

    setLoading(true);
    const { error } = await supabase.from("reguladores_alquiler").insert({
      codigo: codigoLimpio,
      descripcion: descripcionLimpia || null,
      serie: serie.trim() || null,
      etapas: etapas.trim() || null,
      octopus,
      manometro,
      manguera_bc,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ese código ya existe en el catálogo de reguladores.");
      } else {
        setError("No se pudo agregar. Intenta de nuevo.");
      }
      return;
    }

    setCodigo("");
    setDescripcion("");
    setSerie("");
    setEtapas("");
    setOctopus(false);
    setManometro(false);
    setMangueraBc(false);
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
        placeholder="Ej: REG-014"
      />

      <label htmlFor="descripcion">Descripción</label>
      <textarea
        id="descripcion"
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Regulador Scubapro MK25, primera etapa"
      />

      <label htmlFor="serie">Serie</label>
      <input
        id="serie"
        type="text"
        value={serie}
        onChange={(e) => setSerie(e.target.value)}
        placeholder="Ej: SP-2024-118"
      />

      <label htmlFor="etapas">Etapas</label>
      <input
        id="etapas"
        type="text"
        value={etapas}
        onChange={(e) => setEtapas(e.target.value)}
        placeholder="Ej: 2 etapas"
      />

      <label style={{ marginBottom: 4 }}>Accesorios</label>
      <div className="radio-pills">
        <label>
          <input type="checkbox" checked={octopus} onChange={(e) => setOctopus(e.target.checked)} />
          Octopus
        </label>
        <label>
          <input type="checkbox" checked={manometro} onChange={(e) => setManometro(e.target.checked)} />
          Manómetro
        </label>
        <label>
          <input
            type="checkbox"
            checked={manguera_bc}
            onChange={(e) => setMangueraBc(e.target.checked)}
          />
          Manguera de BC
        </label>
      </div>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar regulador"}
      </button>
      {guardado && <div className="success-box">✓ Regulador agregado al catálogo.</div>}
    </form>
  );
}
