"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { proximaInspeccion, finDeMesMasMeses } from "@/lib/fechas";
import MesAnioSelector, { mesAnioCompleto } from "@/components/MesAnioSelector";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function NuevoTanqueForm() {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [serie, setSerie] = useState("");
  // V31: inspección visual e hidrostática solo con mes y año ("aaaa-mm").
  const [ultimaInspeccion, setUltimaInspeccion] = useState("");
  const [ultimaHidro, setUltimaHidro] = useState("");
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
    //
    // V31: solo mes y año. La próxima vence el último día de ese mes + 12
    // meses (inspección) o + 5 años (hidrostática, igual que el trigger de
    // migration_54.sql). Hidrostática vacía = queda "sin prueba registrada".
    if (ultimaInspeccion && !mesAnioCompleto(ultimaInspeccion)) {
      return setError("Elige el mes y el año de la última inspección visual, o deja los dos vacíos.");
    }
    if (ultimaHidro && !mesAnioCompleto(ultimaHidro)) {
      return setError("Elige el mes y el año de la última prueba hidrostática, o deja los dos vacíos.");
    }
    const proxInspeccion = ultimaInspeccion
      ? finDeMesMasMeses(ultimaInspeccion, 12)
      : proximaInspeccion(hoyISO());
    const proxHidro = ultimaHidro ? finDeMesMasMeses(ultimaHidro, 60) : null;

    setLoading(true);
    const { error } = await supabase.from("tanques_alquiler").insert({
      codigo: codigoLimpio,
      descripcion: descripcionLimpia || null,
      serie: serieLimpia || null,
      proxima_inspeccion: proxInspeccion,
      proxima_hidrostatica: proxHidro,
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
    setUltimaHidro("");
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
      <MesAnioSelector
        id="ultima_inspeccion"
        valor={ultimaInspeccion}
        onChange={setUltimaInspeccion}
        anioActual={new Date().getFullYear()}
        aniosAtras={10}
      />
      <p className="hint-text" style={{ marginTop: 4 }}>
        Opcional. Si la dejas vacía, la próxima inspección se calcula desde hoy (+12 meses).
      </p>

      <label htmlFor="ultima_hidro">Última prueba hidrostática</label>
      <MesAnioSelector
        id="ultima_hidro"
        valor={ultimaHidro}
        onChange={setUltimaHidro}
        anioActual={new Date().getFullYear()}
      />
      <p className="hint-text" style={{ marginTop: 4 }}>
        Opcional. La próxima vence al final de ese mes, 5 años después.
      </p>

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar tanque"}
      </button>
      {guardado && <div className="success-box">✓ Tanque agregado al catálogo.</div>}
    </form>
  );
}
