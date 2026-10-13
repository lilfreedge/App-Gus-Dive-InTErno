"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NuevoReguladorForm() {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [serie, setSerie] = useState("");
  const [primeraEtapa, setPrimeraEtapa] = useState("");
  const [segundaEtapa, setSegundaEtapa] = useState("");
  const [octopus, setOctopus] = useState("");
  const [manometro, setManometro] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim();

    if (!codigoLimpio) return;

    setLoading(true);
    const { error } = await supabase.from("reguladores_alquiler").insert({
      codigo: codigoLimpio,
      serie: serie.trim() || null,
      primera_etapa: primeraEtapa.trim() || null,
      segunda_etapa: segundaEtapa.trim() || null,
      octopus: octopus.trim() || null,
      manometro: manometro.trim() || null,
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
    setSerie("");
    setPrimeraEtapa("");
    setSegundaEtapa("");
    setOctopus("");
    setManometro("");
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

      <label htmlFor="serie">Serie</label>
      <input
        id="serie"
        type="text"
        value={serie}
        onChange={(e) => setSerie(e.target.value)}
        placeholder="Ej: SP-2024-118"
      />

      <label htmlFor="primera_etapa">1ra etapa</label>
      <input
        id="primera_etapa"
        type="text"
        value={primeraEtapa}
        onChange={(e) => setPrimeraEtapa(e.target.value)}
        placeholder="Ej: Scubapro MK25"
      />

      <label htmlFor="segunda_etapa">2da etapa</label>
      <input
        id="segunda_etapa"
        type="text"
        value={segundaEtapa}
        onChange={(e) => setSegundaEtapa(e.target.value)}
        placeholder="Ej: Scubapro S600"
      />

      <label htmlFor="octopus">Octopus</label>
      <input
        id="octopus"
        type="text"
        value={octopus}
        onChange={(e) => setOctopus(e.target.value)}
        placeholder="Ej: Scubapro R195"
      />

      <label htmlFor="manometro">Manómetro</label>
      <input
        id="manometro"
        type="text"
        value={manometro}
        onChange={(e) => setManometro(e.target.value)}
        placeholder="Ej: Scubapro"
      />

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar regulador"}
      </button>
      {guardado && <div className="success-box">✓ Regulador agregado al catálogo.</div>}
    </form>
  );
}
