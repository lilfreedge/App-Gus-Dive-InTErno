"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import CampoFoto from "@/components/CampoFoto";
import { subirFoto } from "@/lib/storage-client";

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
          <option key={e} value={e}>{e}</option>
        ))}
      </select>
    </>
  );
}

// Corregir un mantenimiento ya registrado (item 8, pedido explícito,
// 26-sep-2026) -- mismos campos que "Registrar mantenimiento"
// (../nueva/form-client.js), prefilled, con `update` en vez de `insert`.
// Las fotos ya subidas se conservan si no se elige una nueva -- no hace
// falta volver a adjuntarlas para guardar el resto de los cambios.
export default function EditarMantenimientoCompresorForm({ mantenimiento: m, compresores }) {
  const router = useRouter();
  const supabase = createClient();

  const [compresorId, setCompresorId] = useState(m.compresor_id || "");
  const [tipo, setTipo] = useState(m.tipo_mantenimiento || "");
  const [responsable, setResponsable] = useState(m.responsable || "");
  const [fecha, setFecha] = useState(m.fecha || "");
  const [horometro, setHorometro] = useState(String(m.horometro ?? ""));
  const [fotoHorometro, setFotoHorometro] = useState(null);
  const [notas, setNotas] = useState(m.notas || "");

  const [nivelAceite, setNivelAceite] = useState(m.nivel_aceite || "");
  const [limpiezaCompresor, setLimpiezaCompresor] = useState(m.limpieza_compresor || "");
  const [estadoManguera, setEstadoManguera] = useState(m.estado_manguera || "");
  const [estadoFiltroPrincipal, setEstadoFiltroPrincipal] = useState(m.estado_filtro_principal || "");
  const [estadoFiltroFinal, setEstadoFiltroFinal] = useState(m.estado_filtro_final || "");
  const [limpiezaEspacio, setLimpiezaEspacio] = useState(m.limpieza_espacio || "");
  const [fotoEspacio, setFotoEspacio] = useState(null);
  const [otraInspeccion, setOtraInspeccion] = useState(m.otra_inspeccion || "");
  const [fotoOtraInspeccion, setFotoOtraInspeccion] = useState(null);

  const [procesoPiezas, setProcesoPiezas] = useState(m.proceso_piezas || "");
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
    }

    const compresor = compresores.find((c) => c.id === compresorId);

    setLoading(true);

    let fotoHorometroUrl = m.foto_horometro_url;
    let fotoEspacioUrl = m.foto_espacio_url;
    let fotoOtraInspeccionUrl = m.foto_otra_inspeccion_url;
    let fotoReparacionUrl = m.foto_reparacion_url;
    try {
      const carpeta = `mantenimientos/${compresorId}`;
      if (fotoHorometro) fotoHorometroUrl = await subir(fotoHorometro, carpeta);
      if (esInspeccion) {
        if (fotoEspacio) fotoEspacioUrl = await subir(fotoEspacio, carpeta);
        if (fotoOtraInspeccion) fotoOtraInspeccionUrl = await subir(fotoOtraInspeccion, carpeta);
      }
      if (esPreventivoCorrectivo) {
        if (fotoReparacion) fotoReparacionUrl = await subir(fotoReparacion, carpeta);
      }
    } catch {
      setLoading(false);
      setError("No se pudo subir una de las fotos. Intenta de nuevo.");
      return;
    }

    await registrarCambio(supabase, {
      tabla: "mantenimientos_compresores",
      registroId: m.id,
      accion: "editar",
      datosAnteriores: m,
    });

    const { error: err } = await supabase
      .from("mantenimientos_compresores")
      .update({
        compresor_id: compresorId,
        compresor_codigo_snapshot: compresor?.codigo || m.compresor_codigo_snapshot,
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
      })
      .eq("id", m.id);

    setLoading(false);

    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    router.push(`/equipos/compresores/mantenimiento/${m.id}`);
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
        vacio="No hay compresores"
      />

      <label htmlFor="tipo">
        Tipo de mantenimiento <span className="req">*</span>
      </label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="">Selecciona...</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <label htmlFor="responsable">
        Responsable <span className="req">*</span>
      </label>
      <select id="responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
        <option value="">Selecciona...</option>
        {RESPONSABLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <label htmlFor="fecha">
        Fecha <span className="req">*</span>
      </label>
      <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />

      <label htmlFor="horometro">
        Horómetro <span className="req">*</span>
      </label>
      <input id="horometro" type="number" step="0.1" min="0" value={horometro} onChange={(e) => setHorometro(e.target.value)} />

      <div style={{ marginTop: 14 }}>
        {m.foto_horometro_url && !fotoHorometro && (
          <div className="hint-text" style={{ marginBottom: 4 }}>
            Ya tiene una foto. <a href={m.foto_horometro_url} target="_blank" rel="noreferrer">Ver foto actual</a>
          </div>
        )}
        <CampoFoto id="foto_horometro" label="Foto del horómetro" file={fotoHorometro} onChange={setFotoHorometro} />
      </div>

      {esInspeccion && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--borde)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>Datos de la inspección</div>

          <label htmlFor="nivel_aceite">
            Nivel de aceite <span className="req">*</span>
          </label>
          <input id="nivel_aceite" type="text" value={nivelAceite} onChange={(e) => setNivelAceite(e.target.value)} />

          <SelectorEstado id="limpieza_compresor" label="Limpieza compresor" valor={limpiezaCompresor} onChange={setLimpiezaCompresor} required />
          <SelectorEstado id="estado_manguera" label="Estado de manguera" valor={estadoManguera} onChange={setEstadoManguera} required />
          <SelectorEstado id="estado_filtro_principal" label="Estado de filtro principal" valor={estadoFiltroPrincipal} onChange={setEstadoFiltroPrincipal} required />
          <SelectorEstado id="estado_filtro_final" label="Estado de filtro final" valor={estadoFiltroFinal} onChange={setEstadoFiltroFinal} required />
          <SelectorEstado id="limpieza_espacio" label="Limpieza de espacio" valor={limpiezaEspacio} onChange={setLimpiezaEspacio} required />

          <div style={{ marginTop: 14 }}>
            {m.foto_espacio_url && !fotoEspacio && (
              <div className="hint-text" style={{ marginBottom: 4 }}>
                Ya tiene una foto. <a href={m.foto_espacio_url} target="_blank" rel="noreferrer">Ver foto actual</a>
              </div>
            )}
            <CampoFoto id="foto_espacio" label="Foto de espacio" file={fotoEspacio} onChange={setFotoEspacio} />
          </div>

          <label htmlFor="otra_inspeccion" style={{ marginTop: 14 }}>Otra inspección</label>
          <textarea id="otra_inspeccion" value={otraInspeccion} onChange={(e) => setOtraInspeccion(e.target.value)} />

          <div style={{ marginTop: 14 }}>
            {m.foto_otra_inspeccion_url && !fotoOtraInspeccion && (
              <div className="hint-text" style={{ marginBottom: 4 }}>
                Ya tiene una foto. <a href={m.foto_otra_inspeccion_url} target="_blank" rel="noreferrer">Ver foto actual</a>
              </div>
            )}
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
          <textarea id="proceso_piezas" value={procesoPiezas} onChange={(e) => setProcesoPiezas(e.target.value)} />

          <div style={{ marginTop: 14 }}>
            {m.foto_reparacion_url && !fotoReparacion && (
              <div className="hint-text" style={{ marginBottom: 4 }}>
                Ya tiene una foto. <a href={m.foto_reparacion_url} target="_blank" rel="noreferrer">Ver foto actual</a>
              </div>
            )}
            <CampoFoto id="foto_reparacion" label="Foto reparación" file={fotoReparacion} onChange={setFotoReparacion} />
          </div>
        </div>
      )}

      <label htmlFor="notas" style={{ marginTop: 18 }}>
        Notas
      </label>
      <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} />

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 20 }}>
        {loading ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
