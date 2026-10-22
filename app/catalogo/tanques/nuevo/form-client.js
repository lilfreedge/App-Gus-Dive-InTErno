"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { proximaInspeccion, finDeMesMasMeses, MESES_INSPECCION_TANQUE, MESES_HIDROSTATICA } from "@/lib/fechas";
import ConInfo from "@/components/ConInfo";
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
    // V32: inspección cada 2 años (24 meses) para nuestros tanques.
    const proxInspeccion = ultimaInspeccion
      ? finDeMesMasMeses(ultimaInspeccion, MESES_INSPECCION_TANQUE)
      : proximaInspeccion(hoyISO());
    const proxHidro = ultimaHidro ? finDeMesMasMeses(ultimaHidro, MESES_HIDROSTATICA) : null;

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
        setError("Ya hay un tanque ACTIVO con ese código. (Un código solo se puede repetir si el otro tanque está inactivo.)");
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

      <ConInfo style={{ margin: "14px 0 6px" }} texto="Opcional. Si la dejas vacía, la próxima inspección se calcula desde hoy. Vence al final del mes, 2 años después.">
        <label htmlFor="ultima_inspeccion" style={{ margin: 0 }}>Última inspección visual</label>
      </ConInfo>
      <MesAnioSelector
        id="ultima_inspeccion"
        valor={ultimaInspeccion}
        onChange={setUltimaInspeccion}
        anioActual={new Date().getFullYear()}
        aniosAtras={10}
      />

      <ConInfo style={{ margin: "14px 0 6px" }} texto="Opcional. La próxima vence al final de ese mes, 5 años después.">
        <label htmlFor="ultima_hidro" style={{ margin: 0 }}>Última prueba hidrostática</label>
      </ConInfo>
      <MesAnioSelector
        id="ultima_hidro"
        valor={ultimaHidro}
        onChange={setUltimaHidro}
        anioActual={new Date().getFullYear()}
      />

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar tanque"}
      </button>
      {guardado && <div className="success-box">✓ Tanque agregado al catálogo.</div>}
    </form>
  );
}
