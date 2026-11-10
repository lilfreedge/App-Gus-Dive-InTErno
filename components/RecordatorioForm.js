"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { QUE_RECORDATORIO, queDe, textoCada } from "@/lib/recordatorios";
import { numeroWhatsApp } from "@/lib/whatsapp-tecnico";

// V63 ("230. si", maqueta V61, pestaña 2): un solo formulario para todos los
// recordatorios de Equipos (compresores, inspección visual de tanques,
// mantenimiento de reguladores u otra cosa). Cada uno dice qué hay que
// hacer, cada cuánto y a quién le toca. Solo el Titular y los
// administradores llegan aquí. Usa la tabla de antes (recordatorios_compresores).
const VOLVER = "/equipos/recordatorios";

export default function RecordatorioForm({ recordatorio = null, compresores = [], usuarios = [], miNombre = "", sinColumnas = false }) {
  const router = useRouter();
  const supabase = createClient();
  const r = recordatorio;

  const [que, setQue] = useState(r ? queDe(r) : "insp_compresor");
  const [titulo, setTitulo] = useState(r && queDe(r) === "otro" ? r.titulo : "");
  const [cualCompresor, setCualCompresor] = useState(r?.compresor_ids?.length === 1 ? r.compresor_ids[0] : r?.compresor_ids?.length > 1 ? "varios" : "todos");
  const [cada, setCada] = useState(String(r?.cada ?? ""));
  const [unidad, setUnidad] = useState(r?.unidad || "dias");
  const [quien, setQuien] = useState(r?.usuario_ids?.length === 1 ? r.usuario_ids[0] : "");
  const [avisarAntes, setAvisarAntes] = useState(String(r?.avisar_antes ?? 2));
  const [whatsapp, setWhatsapp] = useState(!!r?.avisar_whatsapp);
  const [correo, setCorreo] = useState(!!r?.avisar_correo);
  const [activo, setActivo] = useState(r ? r.activo !== false : true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const [listo, setListo] = useState(null); // { persona, titulo } después de guardar, para el WhatsApp

  const opcion = QUE_RECORDATORIO.find((x) => x.k === que);
  const esCompresor = opcion.que === "compresor";
  const varios = (r?.usuario_ids || []).length > 1;
  const persona = usuarios.find((u) => u.id === quien);

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const n = parseInt(cada, 10);
    const antes = parseInt(avisarAntes, 10);
    if (que === "otro" && !titulo.trim()) return setError("Escribe qué hay que hacer.");
    if (!n || n < 1) return setError("Pon cada cuánto.");
    if (unidad === "horas" && (!esCompresor || cualCompresor === "todos" || cualCompresor === "varios")) return setError("Por horas de uso tiene que ir con un compresor.");
    if (Number.isNaN(antes) || antes < 0) return setError("Pon con cuántos días antes avisa (0 si solo el día que toca).");
    if (!quien && !varios) return setError("Escoge a quién le toca.");

    const tituloFinal =
      que === "otro"
        ? titulo.trim()
        : esCompresor && cualCompresor !== "todos" && cualCompresor !== "varios"
          ? `${opcion.t}` // el compresor sale aparte
          : opcion.t;
    const datos = {
      titulo: tituloFinal,
      cada: n,
      unidad,
      compresor_ids: esCompresor ? (cualCompresor === "todos" ? null : cualCompresor === "varios" ? r.compresor_ids : [cualCompresor]) : que === "otro" && r && queDe(r) === "otro" ? r.compresor_ids ?? [] : [],
      // Si era un mantenimiento correctivo de antes, se queda así.
      reinicia: que === "mant_compresor" && r?.reinicia === "Mantenimiento correctivo" ? r.reinicia : opcion.reinicia,
      avisar_antes: antes,
      usuario_ids: quien ? [quien] : r.usuario_ids,
      activo,
      ...(sinColumnas ? {} : { que: opcion.que, avisar_whatsapp: whatsapp, avisar_correo: correo }),
    };
    if (sinColumnas && opcion.que !== "compresor" && opcion.que !== "otro") return setError("Falta correr en Supabase el SQL de la V63 para los recordatorios de tanques y reguladores.");
    if (sinColumnas && ["semanas", "meses"].includes(unidad)) return setError("Falta correr en Supabase el SQL de la V63 para usar semanas o meses.");

    setLoading(true);
    const antesQuien = r?.usuario_ids || [];
    const res = r
      ? await supabase.from("recordatorios_compresores").update({ ...datos, updated_at: new Date().toISOString() }).eq("id", r.id).select("id")
      : await supabase.from("recordatorios_compresores").insert({ ...datos, creado_por_nombre: miNombre || null }).select("id");
    if (res.error || !res.data || res.data.length === 0) {
      setLoading(false);
      return setError(res.error?.message || "No se pudo guardar. Solo el Titular y los administradores pueden.");
    }
    // "Te asignaron…": solo a la persona nueva.
    const nuevos = datos.usuario_ids.filter((id) => !antesQuien.includes(id));
    if (nuevos.length && activo) {
      await fetch("/api/recordatorios/asignado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: res.data[0].id, usuarios: nuevos }) }).catch(() => {});
    }
    setLoading(false);
    if (whatsapp && persona && nuevos.length) {
      setListo({ persona, texto: `Hola ${String(persona.full_name || "").split(" ")[0]}, te asigné en el app: "${tituloFinal}" (${textoCada(datos).toLowerCase()}). Te sale en Equipos › Recordatorios.` });
      return;
    }
    router.push(VOLVER);
    router.refresh();
  }

  async function borrar() {
    setLoading(true);
    const { data, error: err } = await supabase.from("recordatorios_compresores").delete().eq("id", r.id).select("id");
    setLoading(false);
    if (err || !data || data.length === 0) return setError(err?.message || "No se pudo borrar.");
    router.push(VOLVER);
    router.refresh();
  }

  if (listo)
    return (
      <div className="card">
        <b>Guardado. A {String(listo.persona.full_name || "").split(" ")[0]} le llegó el aviso en el app.</b>
        <p className="hint-text" style={{ marginTop: 6 }}>
          WhatsApp no se puede mandar solo: toca el botón y se abre con el mensaje listo.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {listo.persona.telefono ? (
            <a className="btn btn-primary" style={{ textDecoration: "none", marginTop: 0 }} href={`https://wa.me/${numeroWhatsApp(listo.persona.telefono)}?text=${encodeURIComponent(listo.texto)}`} target="_blank" rel="noopener noreferrer">
              Mandarle por WhatsApp
            </a>
          ) : (
            <span className="hint-text">No tiene celular en su perfil.</span>
          )}
          <button type="button" className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => (router.push(VOLVER), router.refresh())}>
            Listo
          </button>
        </div>
      </div>
    );

  return (
    <form onSubmit={guardar} className="card rec-form">
      <label style={{ marginTop: 0 }}>¿Qué hay que hacer?</label>
      <div className="rec-ops">
        {QUE_RECORDATORIO.map((o) => (
          <button key={o.k} type="button" className={`rec-op${que === o.k ? " sel" : ""}`} onClick={() => (setQue(o.k), o.que !== "compresor" && unidad === "horas" && setUnidad("dias"))}>
            {o.t}
          </button>
        ))}
      </div>
      {que === "otro" && <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Cambiar el agua del lavadero de equipos" />}

      <label>¿Cuál?</label>
      {esCompresor ? (
        <select value={cualCompresor} onChange={(e) => setCualCompresor(e.target.value)}>
          <option value="todos">Todos los compresores</option>
          {cualCompresor === "varios" && <option value="varios">Los que tenía marcados</option>}
          {compresores
            .filter((c) => c.activo !== false)
            .map((c) => (
              <option key={c.id} value={c.id}>
                Compresor {c.codigo}
                {c.descripcion ? ` · ${c.descripcion}` : ""}
              </option>
            ))}
        </select>
      ) : (
        <div className="rec-fijo">{que === "inspeccion_visual" ? "Todos los tanques pendientes" : que === "mant_reguladores" ? "Los reguladores de alquiler pendientes" : "Lo que escribiste arriba"}</div>
      )}

      <label>Cada cuánto</label>
      <div className="rec-cada">
        <input type="number" min="1" inputMode="numeric" value={cada} onChange={(e) => setCada(e.target.value)} placeholder="Ej: 14" />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="dias">días</option>
          <option value="semanas">semanas</option>
          <option value="meses">meses</option>
          {esCompresor && <option value="horas">horas de uso (compresor)</option>}
        </select>
      </div>

      <label>¿A quién le toca?</label>
      {varios && !quien && <div className="hint-text">Antes le salía a: {(r.usuario_ids || []).map((id) => usuarios.find((u) => u.id === id)?.full_name?.split(" ")[0] || "—").join(", ")}. Si escoges una persona, queda solo esa.</div>}
      <div className="rec-ops">
        {usuarios.map((u) => (
          <button key={u.id} type="button" className={`rec-op${quien === u.id ? " sel" : ""}`} onClick={() => setQuien(quien === u.id ? "" : u.id)}>
            {String(u.full_name || "—").split(" ")[0]}
          </button>
        ))}
      </div>

      <label>Avisarle</label>
      <div className="rec-avisar">
        <label className="rec-ck">
          <input type="checkbox" checked readOnly disabled /> Campanita y celular
        </label>
        <label className="rec-ck">
          <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} disabled={sinColumnas} /> WhatsApp
        </label>
        <label className="rec-ck">
          <input type="checkbox" checked={correo} onChange={(e) => setCorreo(e.target.checked)} disabled={sinColumnas} /> Correo
        </label>
      </div>
      <div className="rec-antes">
        <input type="number" min="0" inputMode="numeric" value={avisarAntes} onChange={(e) => setAvisarAntes(e.target.value)} />
        <span>{unidad === "horas" ? "horas antes, y cuando toca." : "días antes, y el día que toca."}</span>
      </div>

      {r && (
        <label className="rec-ck" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Encendido
        </label>
      )}

      {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 14 }}>
        {loading ? "Guardando…" : "Guardar"}
      </button>

      {r &&
        (confirmarBorrar ? (
          <div className="rec-borrar">
            ¿Borrar &quot;{r.titulo}&quot;? No se puede deshacer.
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ marginTop: 0 }} onClick={() => setConfirmarBorrar(false)}>
                No
              </button>
              <button type="button" className="btn btn-primary" style={{ marginTop: 0, background: "var(--rojo)" }} disabled={loading} onClick={borrar}>
                Sí, borrar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" style={{ marginTop: 10 }} onClick={() => setConfirmarBorrar(true)}>
            Borrar recordatorio
          </button>
        ))}
    </form>
  );
}
