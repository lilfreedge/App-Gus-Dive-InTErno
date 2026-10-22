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

// V33: `anterior` -- tanque rechazado en PH cuyo código se usa en este
// tanque nuevo (ver page.js). El código viene fijo, la serie es obligatoria
// y al guardar se abre la ficha del tanque nuevo.
export default function NuevoTanqueForm({ anterior = null }) {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState(anterior?.codigo || "");
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
    if (anterior && !serieLimpia) return setError("Pon el número de serie del tanque nuevo.");

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
    const { data: creado, error } = await supabase
      .from("tanques_alquiler")
      .insert({
        codigo: codigoLimpio,
        descripcion: descripcionLimpia || null,
        serie: serieLimpia || null,
        proxima_inspeccion: proxInspeccion,
        proxima_hidrostatica: proxHidro,
      })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ya hay un tanque ACTIVO con ese código. (Un código solo se puede repetir si el otro tanque está inactivo.)");
      } else {
        setError("No se pudo agregar. Intenta de nuevo.");
      }
      return;
    }

    if (anterior && creado?.id) {
      router.push(`/catalogo/tanques/${creado.id}`);
      router.refresh();
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
        disabled={!!anterior}
        style={anterior ? { opacity: 0.7 } : undefined}
      />
      {anterior && (
        <div className="hint-text">
          Viene del tanque rechazado en prueba hidrostática. El {anterior.codigo} viejo se queda inactivo con su historial.
        </div>
      )}

      <label htmlFor="descripcion">Descripción</label>
      <textarea
        id="descripcion"
        rows={2}
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Tanque de aluminio 80 pies³"
      />

      <label htmlFor="serie">
        Número de serie {anterior && <span className="req">*</span>}
      </label>
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
      {anterior && <div className="hint-text">Del tanque nuevo, no del viejo. La próxima se calcula sola.</div>}

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" style={{ marginTop: 20 }} type="submit" disabled={loading}>
        {loading ? "Guardando..." : anterior ? "Guardar tanque nuevo" : "Guardar tanque"}
      </button>
      {guardado && <div className="success-box">✓ Tanque agregado al catálogo.</div>}
    </form>
  );
}
