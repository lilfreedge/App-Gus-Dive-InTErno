"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import CampoFoto from "@/components/CampoFoto";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO, sumarDias } from "@/lib/fechas";

const TIPOS = ["Inspección", "Mantenimiento preventivo", "Mantenimiento correctivo"];
const RESPONSABLES = ["Gugi", "Pipe", "Frederick", "Alexander", "Danny"];
const ESTADOS = ["Satisfactorio", "Aceptable", "Deficiente"];

function SelectorEstado({ id, label, valor, onChange, required }) {
  return (
    <>
      <label htmlFor={id}>
        {label} {required && <span className="req">*</span>}
      </label>
      <select id={id} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">Selecciona...</option>
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    </>
  );
}

export default function NuevoMantenimientoCompresorForm({ userId, nombreUsuario, compresores, compresorPreseleccionado }) {
  const router = useRouter();
  const supabase = createClient();

  const [compresorId, setCompresorId] = useState(compresorPreseleccionado || compresores[0]?.id || "");
  const [tipo, setTipo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [horometro, setHorometro] = useState("");
  const [fotoHorometro, setFotoHorometro] = useState(null);
  const [notas, setNotas] = useState("");

  // Inspección
  const [nivelAceite, setNivelAceite] = useState("");
  const [limpiezaCompresor, setLimpiezaCompresor] = useState("");
  const [estadoManguera, setEstadoManguera] = useState("");
  const [estadoFiltroPrincipal, setEstadoFiltroPrincipal] = useState("");
  const [estadoFiltroFinal, setEstadoFiltroFinal] = useState("");
  const [limpiezaEspacio, setLimpiezaEspacio] = useState("");
  const [fotoEspacio, setFotoEspacio] = useState(null);
  const [otraInspeccion, setOtraInspeccion] = useState("");
  const [fotoOtraInspeccion, setFotoOtraInspeccion] = useState(null);

  // Preventivo / Correctivo
  const [procesoPiezas, setProcesoPiezas] = useState("");
  const [fotoReparacion, setFotoReparacion] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const esInspeccion = tipo === "Inspección";
  const esPreventivoCorrectivo = tipo === "Mantenimiento preventivo" || tipo === "Mantenimiento correctivo";

  async function subir(file, carpeta) {
    if (!file) return null;
    return subirFoto(supabase, file, carpeta);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!compresorId) return setError("Selecciona un compresor.");
    if (!tipo) return setError("Selecciona el tipo de mantenimiento.");
    if (!responsable) return setError("Selecciona el responsable.");
    if (!fecha) return setError("Selecciona la fecha.");
    if (!horometro.toString().trim()) return setError("Completa el horómetro.");
    if (!fotoHorometro) return setError("Adjunta la foto del horómetro.");

    if (esInspeccion) {
      if (!nivelAceite.trim()) return setError("Completa el nivel de aceite.");
      if (!limpiezaCompresor) return setError("Selecciona la limpieza del compresor.");
      if (!estadoManguera) return setError("Selecciona el estado de la manguera.");
      if (!estadoFiltroPrincipal) return setError("Selecciona el estado del filtro principal.");
      if (!estadoFiltroFinal) return setError("Selecciona el estado del filtro final.");
      if (!limpiezaEspacio) return setError("Selecciona la limpieza del espacio.");
    }

    if (esPreventivoCorrectivo) {
      if (!procesoPiezas.trim()) return setError("Completa el proceso y piezas utilizadas.");
      if (!fotoReparacion) return setError("Adjunta la foto de la reparación.");
    }

    const compresor = compresores.find((c) => c.id === compresorId);

    setLoading(true);

    let fotoHorometroUrl, fotoEspacioUrl, fotoOtraInspeccionUrl, fotoReparacionUrl;
    try {
      const carpeta = `mantenimientos/${compresorId}`;
      fotoHorometroUrl = await subir(fotoHorometro, carpeta);
      if (esInspeccion) {
        fotoEspacioUrl = await subir(fotoEspacio, carpeta);
        fotoOtraInspeccionUrl = await subir(fotoOtraInspeccion, carpeta);
      }
      if (esPreventivoCorrectivo) {
        fotoReparacionUrl = await subir(fotoReparacion, carpeta);
      }
    } catch (err) {
      setLoading(false);
      setError("No se pudo subir una de las fotos. Intenta de nuevo.");
      return;
    }

    const { error } = await supabase.from("mantenimientos_compresores").insert({
      user_id: userId,
      nombre_usuario_snapshot: nombreUsuario,
      compresor_id: compresorId,
      compresor_codigo_snapshot: compresor?.codigo || null,
      tipo_mantenimiento: tipo,
      responsable,
      fecha,
      horometro: Number(horometro),
      foto_horometro_url: fotoHorometroUrl,
      notas: notas.trim() || null,
      nivel_aceite: esInspeccion ? nivelAceite.trim() || null : null,
      limpieza_compresor: esInspeccion ? limpiezaCompresor || null : null,
      estado_manguera: esInspeccion ? estadoManguera || null : null,
      estado_filtro_principal: esInspeccion ? estadoFiltroPrincipal || null : null,
      estado_filtro_final: esInspeccion ? estadoFiltroFinal || null : null,
      limpieza_espacio: esInspeccion ? limpiezaEspacio || null : null,
      foto_espacio_url: esInspeccion ? fotoEspacioUrl || null : null,
      otra_inspeccion: esInspeccion ? otraInspeccion.trim() || null : null,
      foto_otra_inspeccion_url: esInspeccion ? fotoOtraInspeccionUrl || null : null,
      proceso_piezas: esPreventivoCorrectivo ? procesoPiezas.trim() || null : null,
      foto_reparacion_url: esPreventivoCorrectivo ? fotoReparacionUrl || null : null,
    });

    setLoading(false);

    if (error) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    // Mejor esfuerzo: si fue una Inspección, actualiza la próxima
    // inspección del compresor (+14 días -- cada 2 semanas, confirmado
    // por el usuario). Preventivo/Correctivo no llevan rango todavía.
    // No bloquea la navegación si falla.
    if (esInspeccion) {
      try {
        await supabase
          .from("compresores")
          .update({ proxima_inspeccion: sumarDias(fecha, 14) })
          .eq("id", compresorId);
      } catch (e) {
        console.error("No se pudo actualizar proxima_inspeccion del compresor:", e);
      }
    }

    router.push(`/equipos/compresores/${compresorId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="compresor">
        Compresor <span className="req">*</span>
      </label>
      <SelectorBusqueda
        items={compresores}
        valor={compresorId}
        onChange={setCompresorId}
        placeholder="Escribe para buscar compresor por código..."
        vacio="No hay compresores activos"
      />

      <label htmlFor="tipo">
        Tipo de mantenimiento <span className="req">*</span>
      </label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="">Selecciona...</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <label htmlFor="responsable">
        Responsable <span className="req">*</span>
      </label>
      <select id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
        <option value="">Selecciona...</option>
        {RESPONSABLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <label htmlFor="fecha">
        Fecha <span className="req">*</span>
      </label>
      <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="horometro">
        Horómetro <span className="req">*</span>
      </label>
      <input
        id="horometro"
        type="number"
        step="0.1"
        min="0"
        value={horometro}
        onChange={(e) => setHorometro(e.target.value)}
        placeholder="Ej: 1245.5"
      />

      <div style={{ marginTop: 14 }}>
        <CampoFoto id="foto_horometro" label="Foto del horómetro" file={fotoHorometro} onChange={setFotoHorometro} required />
      </div>

      {esInspeccion && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--borde)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>Datos de la inspección</div>

          <label htmlFor="nivel_aceite">
            Nivel de aceite <span className="req">*</span>
          </label>
          <input
            id="nivel_aceite"
            type="text"
            value={nivelAceite}
            onChange={(e) => setNivelAceite(e.target.value)}
            placeholder="Ej: Correcto, o cuánto se le rellenó"
          />

          <SelectorEstado id="limpieza_compresor" label="Limpieza compresor" valor={limpiezaCompresor} onChange={setLimpiezaCompresor} required />
          <SelectorEstado id="estado_manguera" label="Estado de manguera" valor={estadoManguera} onChange={setEstadoManguera} required />
          <SelectorEstado id="estado_filtro_principal" label="Estado de filtro principal" valor={estadoFiltroPrincipal} onChange={setEstadoFiltroPrincipal} required />
          <SelectorEstado id="estado_filtro_final" label="Estado de filtro final" valor={estadoFiltroFinal} onChange={setEstadoFiltroFinal} required />
          <SelectorEstado id="limpieza_espacio" label="Limpieza de espacio" valor={limpiezaEspacio} onChange={setLimpiezaEspacio} required />

          <div style={{ marginTop: 14 }}>
            <CampoFoto id="foto_espacio" label="Foto de espacio" file={fotoEspacio} onChange={setFotoEspacio} />
          </div>

          <label htmlFor="otra_inspeccion" style={{ marginTop: 14 }}>Otra inspección</label>
          <textarea
            id="otra_inspeccion"
            value={otraInspeccion}
            onChange={(e) => setOtraInspeccion(e.target.value)}
            placeholder="Cualquier otro punto revisado (opcional)"
          />

          <div style={{ marginTop: 14 }}>
            <CampoFoto id="foto_otra_inspeccion" label="Foto otra inspección" file={fotoOtraInspeccion} onChange={setFotoOtraInspeccion} />
          </div>
        </div>
      )}

      {esPreventivoCorrectivo && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--borde)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            Datos del {tipo === "Mantenimiento preventivo" ? "mantenimiento preventivo" : "mantenimiento correctivo"}
          </div>

          <label htmlFor="proceso_piezas">
            Proceso y piezas utilizadas <span className="req">*</span>
          </label>
          <textarea
            id="proceso_piezas"
            value={procesoPiezas}
            onChange={(e) => setProcesoPiezas(e.target.value)}
            placeholder="Qué se hizo y qué piezas se usaron"
          />

          <div style={{ marginTop: 14 }}>
            <CampoFoto id="foto_reparacion" label="Foto reparación 1" file={fotoReparacion} onChange={setFotoReparacion} required />
          </div>
        </div>
      )}

      <label htmlFor="notas" style={{ marginTop: 18 }}>
        Notas
      </label>
      <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cualquier detalle extra (opcional)" />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading || compresores.length === 0} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Registrar mantenimiento"}
      </button>
    </form>
  );
}
