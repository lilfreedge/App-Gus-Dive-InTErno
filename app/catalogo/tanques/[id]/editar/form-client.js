"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import MesAnioSelector, { mesAnioCompleto } from "@/components/MesAnioSelector";
import ConInfo from "@/components/ConInfo";
import { finDeMesMasMeses, mesAnioMenosMeses, MESES_INSPECCION_TANQUE, MESES_HIDROSTATICA } from "@/lib/fechas";

export default function EditarTanqueForm({ tanque }) {
  const router = useRouter();
  const supabase = createClient();
  const [codigo, setCodigo] = useState(tanque.codigo || "");
  const [descripcion, setDescripcion] = useState(tanque.descripcion || "");
  const [serie, setSerie] = useState(tanque.serie || "");
  // V32 (pedido explícito: poder editar la fecha de inspección visual y la de
  // prueba hidrostática "por si algún día hay que ponerle la mano a eso";
  // decidido: pedir la ÚLTIMA con mes y año, igual que Nuevo tanque). Se
  // guarda la PRÓXIMA, así que la última se precarga a partir de ella.
  const inicialInsp = mesAnioMenosMeses(tanque.proxima_inspeccion, MESES_INSPECCION_TANQUE);
  const inicialHidro = mesAnioMenosMeses(tanque.proxima_hidrostatica, MESES_HIDROSTATICA);
  const [ultimaInspeccion, setUltimaInspeccion] = useState(inicialInsp);
  const [ultimaHidro, setUltimaHidro] = useState(inicialHidro);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim();
    const descripcionLimpia = descripcion.trim();
    const serieLimpia = serie.trim();

    if (!codigoLimpio) return;
    if (ultimaInspeccion && !mesAnioCompleto(ultimaInspeccion)) {
      return setError("Elige el mes y el año de la última inspección visual.");
    }
    if (ultimaHidro && !mesAnioCompleto(ultimaHidro)) {
      return setError("Elige el mes y el año de la última prueba hidrostática, o deja los dos vacíos.");
    }

    setLoading(true);

    // Guarda también el "después" (item 11, pedido explícito, 27-sep-2026:
    // "pon este mismo formato de historial en app interno") -- mismo
    // patrón que ya usa App Equipos de clientes (item 20).
    const cambios = { codigo: codigoLimpio, descripcion: descripcionLimpia || null, serie: serieLimpia || null };
    // Solo se tocan las fechas si se cambiaron (así no se "redondea" una
    // próxima fecha que nadie tocó).
    if (ultimaInspeccion && ultimaInspeccion !== inicialInsp) {
      cambios.proxima_inspeccion = finDeMesMasMeses(ultimaInspeccion, MESES_INSPECCION_TANQUE);
    }
    if (ultimaHidro !== inicialHidro) {
      cambios.proxima_hidrostatica = ultimaHidro ? finDeMesMasMeses(ultimaHidro, MESES_HIDROSTATICA) : null;
    }

    await registrarCambio(supabase, {
      tabla: "tanques_alquiler",
      registroId: tanque.id,
      accion: "editar",
      datosAnteriores: tanque,
      datosNuevos: cambios,
    });

    const { error } = await supabase.from("tanques_alquiler").update(cambios).eq("id", tanque.id);
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("duplicate")) {
        setError("Ya hay otro tanque ACTIVO con ese código.");
      } else {
        setError("No se pudo guardar. Intenta de nuevo.");
      }
      return;
    }

    router.push(`/catalogo/tanques/${tanque.id}`);
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

      <ConInfo
        style={{ margin: "14px 0 6px" }}
        texto="Vence al final del mes, 2 años después. Si después se registra una inspección de este tanque, la próxima fecha se vuelve a calcular sola."
      >
        <label htmlFor="ultima_inspeccion" style={{ margin: 0 }}>Última inspección visual</label>
      </ConInfo>
      <MesAnioSelector
        id="ultima_inspeccion"
        valor={ultimaInspeccion}
        onChange={setUltimaInspeccion}
        anioActual={new Date().getFullYear()}
        aniosAtras={10}
      />

      <ConInfo
        style={{ margin: "14px 0 6px" }}
        texto="Vence al final del mes, 5 años después. Si la dejas vacía, queda sin prueba registrada. Si después se registra una prueba hidrostática de este tanque, la próxima fecha se vuelve a calcular sola."
      >
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
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
