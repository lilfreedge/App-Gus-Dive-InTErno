"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SelectorBusqueda from "@/components/SelectorBusqueda";
import CampoFoto from "@/components/CampoFoto";
import { subirFoto } from "@/lib/storage-client";
import { hoyISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { NIVELES_ACEITE, formatHoras } from "@/lib/compresores";
import { leerHorometro } from "@/lib/leer-horometro";
import { IconCalendar } from "@/components/icons";

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

// V37 (plan-v37.html, todo aprobado):
// - Sin campo de fecha: la pone la base de datos al guardar (opción A,
//   "para evitar que registren cosas falsas"; migration_70.sql).
// - Foto del horómetro primero: la IA lee el número y lo pone en el campo;
//   se puede corregir, y si se cambia queda guardado lo que leyó la foto
//   (horometro_leido) y en el historial sale ✎.
// - Avisa cuántas horas van desde el último registro del compresor y no
//   deja poner un número menor (la base de datos también lo revisa).
// - Nivel de aceite con lista + "¿Se le echó aceite?".
const MENSAJES_LECTURA = {
  sin_llave: "",
  no_se_lee: "No se pudo leer el número en la foto. Escríbelo tú (o toma otra foto de frente y de cerca).",
  foto: "No se pudo abrir la foto para leerla. Escribe el número.",
  tiempo: "La lectura tardó demasiado. Escribe el número.",
};

export default function NuevoMantenimientoCompresorForm({
  userId,
  nombreUsuario,
  compresores,
  compresorPreseleccionado,
  ultimos = {},
  esTitular = false,
  lecturaDisponible = false,
}) {
  const router = useRouter();
  const supabase = createClient();

  const [compresorId, setCompresorId] = useState(compresorPreseleccionado || compresores[0]?.id || "");
  const [tipo, setTipo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [horometro, setHorometro] = useState("");
  const [horometroLeido, setHorometroLeido] = useState(null);
  const [leyendo, setLeyendo] = useState(false);
  const [avisoLectura, setAvisoLectura] = useState("");
  const [fotoHorometro, setFotoHorometro] = useState(null);
  const [notas, setNotas] = useState("");

  // Inspección
  const [nivelAceite, setNivelAceite] = useState("");
  const [aceiteEchado, setAceiteEchado] = useState(null);
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
  const compresor = compresores.find((c) => c.id === compresorId);
  const ultimo = compresorId ? ultimos[compresorId] : null;
  const valor = horometro.toString().trim() === "" ? null : Number(horometro);
  const diferencia = ultimo && valor !== null && !Number.isNaN(valor) ? valor - ultimo.horometro : null;
  const corregido = horometroLeido !== null && valor !== null && valor !== horometroLeido;

  async function alElegirFoto(file) {
    setFotoHorometro(file);
    setAvisoLectura("");
    if (!file || !lecturaDisponible) return;
    setLeyendo(true);
    const r = await leerHorometro(file);
    setLeyendo(false);
    if (r?.ok) {
      setHorometroLeido(r.horas);
      setHorometro(String(r.horas));
    } else {
      setHorometroLeido(null);
      setAvisoLectura(MENSAJES_LECTURA[r?.motivo] ?? "No se pudo leer el número de la foto. Escríbelo tú.");
    }
  }

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
    if (!fotoHorometro) return setError("Adjunta la foto del horómetro.");
    if (!horometro.toString().trim()) return setError("Completa el horómetro.");
    if (Number.isNaN(valor) || valor < 0) return setError("El horómetro tiene que ser un número.");
    if (!esTitular && ultimo && valor < ultimo.horometro) {
      return setError(
        `El horómetro no puede ser menor que el último registrado de este compresor (${formatHoras(ultimo.horometro)} h).`
      );
    }

    if (esInspeccion) {
      if (!nivelAceite) return setError("Selecciona el nivel de aceite.");
      if (aceiteEchado === null) return setError("Marca si se le echó aceite.");
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
      // La base de datos la cambia por la de hoy de todas formas.
      fecha: hoyISO(),
      horometro: valor,
      horometro_leido: horometroLeido,
      foto_horometro_url: fotoHorometroUrl,
      notas: notas.trim() || null,
      nivel_aceite: esInspeccion ? nivelAceite || null : null,
      aceite_echado: esInspeccion ? aceiteEchado : null,
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
      setError(
        /horómetro/i.test(error.message || "")
          ? error.message
          : "No se pudo guardar. Intenta de nuevo."
      );
      return;
    }

    router.push(`/equipos/compresores/${compresorId}`);
    router.refresh();
  }

  const estiloSiNo = { marginTop: 0, width: "auto", padding: "8px 22px" };

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

      <div style={{ marginTop: 14 }}>
        <CampoFoto id="foto_horometro" label="Foto del horómetro" file={fotoHorometro} onChange={alElegirFoto} required />
        {lecturaDisponible && !fotoHorometro && (
          <div className="hint-text" style={{ marginTop: 4 }}>
            Primero la foto: la app lee el número sola. De frente, de cerca y sin reflejo.
          </div>
        )}
      </div>

      {leyendo && (
        <div className="aviso-box" style={{ marginTop: 10 }}>
          Leyendo el horómetro de la foto...
        </div>
      )}
      {!leyendo && horometroLeido !== null && (
        <div className="success-box" style={{ marginTop: 10 }}>
          <b>Leído de la foto: {formatHoras(horometroLeido)} h</b>
          <br />
          <span style={{ color: "var(--texto-suave)" }}>
            Revísalo. Si lo cambias a mano, queda marcado en el historial.
          </span>
        </div>
      )}
      {!leyendo && avisoLectura && (
        <div className="aviso-box" style={{ marginTop: 10 }}>
          {avisoLectura}
        </div>
      )}

      <label htmlFor="horometro">
        Horómetro <span className="req">*</span>
      </label>
      <input
        id="horometro"
        type="number"
        step="0.1"
        min="0"
        inputMode="decimal"
        value={horometro}
        onChange={(e) => setHorometro(e.target.value)}
        placeholder="Ej: 1245.5"
      />
      {ultimo && (
        <div className="hint-text" style={{ marginTop: 6 }}>
          Último registro del {compresor?.codigo}: {formatHoras(ultimo.horometro)} h ({formatFechaDDMMAAAADeDate(ultimo.fecha)})
          {diferencia !== null && (
            <>
              {" "}→{" "}
              <b style={diferencia < 0 ? { color: "var(--rojo)" } : undefined}>
                {diferencia >= 0 ? "+" : ""}
                {formatHoras(Math.round(diferencia * 10) / 10)} h
              </b>
            </>
          )}
        </div>
      )}
      {corregido && (
        <div className="hint-text" style={{ marginTop: 4, color: "#b5691f" }}>
          ✎ Cambiado a mano (la foto decía {formatHoras(horometroLeido)} h).
        </div>
      )}

      {esInspeccion && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--borde)" }}>
          <div className="section-title" style={{ marginTop: 0 }}>Datos de la inspección</div>

          <label htmlFor="nivel_aceite">
            Nivel de aceite <span className="req">*</span>
          </label>
          <div className="hint-text" style={{ marginTop: 0 }}>
            Como lo encontraste en la mirilla, antes de echarle.
          </div>
          <select id="nivel_aceite" value={nivelAceite} onChange={(e) => setNivelAceite(e.target.value)}>
            <option value="">Selecciona...</option>
            {NIVELES_ACEITE.map((n) => (
              <option key={n.valor} value={n.valor}>
                {n.label}
              </option>
            ))}
          </select>

          <label>
            ¿Se le echó aceite? <span className="req">*</span>
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              className={aceiteEchado === false ? "btn btn-primary" : "btn secondary"}
              style={estiloSiNo}
              onClick={() => setAceiteEchado(false)}
            >
              No
            </button>
            <button
              type="button"
              className={aceiteEchado === true ? "btn btn-primary" : "btn secondary"}
              style={estiloSiNo}
              onClick={() => setAceiteEchado(true)}
            >
              Sí
            </button>
          </div>

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

      <div
        style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", color: "var(--texto-suave)", fontSize: 13 }}
      >
        <IconCalendar size={16} />
        <span>
          Fecha: <b style={{ color: "var(--texto)" }}>hoy, {formatFechaDDMMAAAADeDate(hoyISO())}</b>. Se guarda sola.
        </span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <button
        className="btn btn-primary"
        type="submit"
        disabled={loading || leyendo || compresores.length === 0}
        style={{ marginTop: 16 }}
      >
        {loading ? "Guardando..." : "Registrar mantenimiento"}
      </button>
    </form>
  );
}
