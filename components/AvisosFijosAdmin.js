"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  COLORES_AVISO,
  DIAS_SEMANA,
  ETIQUETA_TIPO,
  OCURRENCIA_FIJO,
  cuandoAviso,
  destinatarios,
  entraAlApp,
  esTecnicoPerfil,
  ultimaVez,
} from "@/lib/avisos-fijos";

// V51 -- ⚙ › Administración › Avisos fijos, de App Interno o de App Equipos
// de clientes (maqueta-v51-todo-junto.html, pestaña 2). Lo usan el Titular
// y los administradores. Crear, editar y quitar avisos, y ver quién leyó
// los que llevan "Listo". "Quitar" no borra: lo apaga (se puede volver a
// poner).

const VACIO = {
  texto: "",
  color: "amarillo",
  tipo: "fijo",
  hastaModo: "quite", // quite | fecha
  hasta: "",
  cada: "semana",
  dia_semana: 1,
  dia_mes: 1,
  fecha: "",
  sigue_hasta_listo: false,
  aQuien: "todos", // todos | escoger
  para: [],
  pide_listo: false,
};

function Pills({ opciones, valor, onChange }) {
  return (
    <div className="af-pills">
      {opciones.map((o) => (
        <button key={String(o.v)} type="button" className={valor === o.v ? "sel" : ""} onClick={() => onChange(o.v)}>
          {o.t}
        </button>
      ))}
    </div>
  );
}

const horaCorta = (ts) =>
  new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", hour: "numeric", minute: "2-digit" }).format(new Date(ts));

export default function AvisosFijosAdmin({ app, avisos = [], leidos = [], perfiles = [], yoNombre = "", hoy }) {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState(null); // null = cerrado
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [quitando, setQuitando] = useState(null);
  const [verQuitados, setVerQuitados] = useState(false);

  const nombreApp = app === "interno" ? "App Interno" : "App Equipos de clientes";
  const personas = useMemo(
    () => perfiles.filter((p) => entraAlApp(p, app)).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")),
    [perfiles, app]
  );
  const activos = avisos.filter((a) => a.activo);
  const quitados = avisos.filter((a) => !a.activo);
  const set = (c) => setForm((f) => ({ ...f, ...c }));

  function abrirNuevo() {
    setEditandoId(null);
    setForm({ ...VACIO, fecha: hoy });
    setError("");
  }

  function abrirEditar(a) {
    setEditandoId(a.id);
    setError("");
    setForm({
      ...VACIO,
      texto: a.texto,
      color: a.color,
      tipo: a.tipo,
      hastaModo: a.hasta ? "fecha" : "quite",
      hasta: a.hasta || "",
      cada: a.cada || "semana",
      dia_semana: Number.isInteger(a.dia_semana) ? a.dia_semana : 1,
      dia_mes: a.dia_mes || 1,
      fecha: a.fecha || "",
      sigue_hasta_listo: !!a.sigue_hasta_listo,
      aQuien: Array.isArray(a.para) && a.para.length ? "escoger" : "todos",
      para: Array.isArray(a.para) ? a.para : [],
      pide_listo: !!a.pide_listo,
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function guardar() {
    setError("");
    const texto = form.texto.trim();
    if (!texto) return setError("Escribe el aviso.");
    if (form.tipo === "fijo" && form.hastaModo === "fecha" && !form.hasta) return setError("Escoge hasta qué día sale.");
    if (form.tipo === "una_vez" && !form.fecha) return setError("Escoge el día.");
    if (form.aQuien === "escoger" && !form.para.length) return setError("Escoge al menos una persona.");
    const fila = {
      app,
      texto,
      color: form.color,
      tipo: form.tipo,
      hasta: form.tipo === "fijo" && form.hastaModo === "fecha" ? form.hasta : null,
      cada: form.tipo === "repite" ? form.cada : null,
      dia_semana: form.tipo === "repite" && form.cada === "semana" ? Number(form.dia_semana) : null,
      dia_mes: form.tipo === "repite" && form.cada === "mes" ? Number(form.dia_mes) : null,
      fecha: form.tipo === "una_vez" ? form.fecha : null,
      sigue_hasta_listo: form.tipo === "una_vez" && form.pide_listo ? !!form.sigue_hasta_listo : false,
      para: form.aQuien === "escoger" ? form.para : [],
      pide_listo: !!form.pide_listo,
      actualizado_en: new Date().toISOString(),
    };
    setGuardando(true);
    const { error: e } = editandoId
      ? await supabase.from("avisos_fijos").update(fila).eq("id", editandoId)
      : await supabase.from("avisos_fijos").insert({ ...fila, creado_por_nombre: yoNombre });
    setGuardando(false);
    if (e) return setError("No se pudo guardar. Intenta de nuevo.");
    setForm(null);
    setEditandoId(null);
    router.refresh();
  }

  async function cambiarActivo(a, activo) {
    const { error: e } = await supabase.from("avisos_fijos").update({ activo, actualizado_en: new Date().toISOString() }).eq("id", a.id);
    if (e) return setError("No se pudo cambiar. Intenta de nuevo.");
    setQuitando(null);
    router.refresh();
  }

  function aQuienTexto(a) {
    const para = Array.isArray(a.para) ? a.para : [];
    if (!para.length) return "a todos (menos los técnicos)";
    const nombres = para.map((id) => (perfiles.find((p) => p.id === id)?.full_name || "—").split(" ")[0]);
    return nombres.length <= 3 ? nombres.join(", ") : `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más`;
  }

  function lecturas(a) {
    if (!a.pide_listo) return null;
    const vez = a.tipo === "fijo" ? OCURRENCIA_FIJO : ultimaVez(a, hoy);
    if (!vez) return <div className="leido">Todavía no le toca salir.</div>;
    const deEsta = leidos.filter((l) => l.aviso_id === a.id && String(l.ocurrencia).slice(0, 10) === vez);
    const ya = new Set(deEsta.map((l) => l.user_id));
    const faltan = destinatarios(a, perfiles).filter((p) => !ya.has(p.id));
    const prefijo = a.tipo === "repite" ? (vez === hoy ? "Hoy: " : "Esta vez: ") : "";
    return (
      <div className="leido">
        {prefijo}
        {deEsta.length ? (
          <>
            Leído:{" "}
            {deEsta.map((l, i) => (
              <span key={l.user_id}>
                {i > 0 ? ", " : ""}
                <b>{(l.nombre || "—").split(" ")[0]}</b> ({horaCorta(l.leido_en)})
              </span>
            ))}
          </>
        ) : (
          "Nadie lo ha leído todavía"
        )}
        {faltan.length ? ` · Falta: ${faltan.map((p) => (p.full_name || "—").split(" ")[0]).join(", ")}` : deEsta.length ? " · Ya lo leyeron todos" : ""}
      </div>
    );
  }

  function tarjeta(a, quitado = false) {
    const badge = { rojo: "badge-rojo", amarillo: "badge-amarillo", azul: "badge-azul" }[a.color] || "";
    return (
      <div key={a.id} className="list-item">
        <div className="list-item-top">
          <span className="list-item-title" style={{ whiteSpace: "pre-wrap" }}>
            <span className={`badge ${badge}`} style={{ marginLeft: 0, marginRight: 6 }}>
              {ETIQUETA_TIPO[a.tipo]}
            </span>
            {a.texto}
          </span>
        </div>
        <div className="list-item-meta">
          {cuandoAviso(a)} · {aQuienTexto(a)} · {(a.creado_por_nombre || "—").split(" ")[0]} · {a.pide_listo ? <b>con &quot;Listo&quot;</b> : 'sin "Listo"'}
        </div>
        {!quitado && lecturas(a)}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          {quitado ? (
            <button type="button" className="btn secondary af-mini" onClick={() => cambiarActivo(a, true)}>
              Volver a ponerlo
            </button>
          ) : quitando === a.id ? (
            <>
              <span className="hint-text" style={{ margin: 0 }}>
                ¿Quitarlo? Deja de salir en Inicio.
              </span>
              <button type="button" className="btn danger af-mini" onClick={() => cambiarActivo(a, false)}>
                Sí, quitar
              </button>
              <button type="button" className="btn secondary af-mini" onClick={() => setQuitando(null)}>
                No
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn secondary af-mini" onClick={() => abrirEditar(a)}>
                Editar
              </button>
              <button type="button" className="btn secondary af-mini" style={{ color: "var(--rojo)" }} onClick={() => setQuitando(a.id)}>
                Quitar
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {!form && (
        <button type="button" className="btn btn-primary" style={{ width: "auto", margin: "0 0 14px" }} onClick={abrirNuevo}>
          + Nuevo aviso
        </button>
      )}

      {form && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginTop: 0 }}>
            {editandoId ? "Editar aviso" : "Nuevo aviso"}
          </div>
          <label style={{ marginTop: 0 }}>
            Aviso <span className="req">*</span>
          </label>
          <textarea rows={2} value={form.texto} onChange={(e) => set({ texto: e.target.value })} placeholder="Lo que tiene que saber la gente" autoFocus />

          <label>Color</label>
          <Pills opciones={COLORES_AVISO} valor={form.color} onChange={(v) => set({ color: v })} />

          <label>¿Cómo funciona?</label>
          <Pills
            opciones={[
              { v: "fijo", t: "Fijo" },
              { v: "repite", t: "Se repite" },
              { v: "una_vez", t: "Una sola vez" },
            ]}
            valor={form.tipo}
            onChange={(v) => set({ tipo: v })}
          />

          {form.tipo === "fijo" && (
            <>
              <label>¿Hasta cuándo?</label>
              <Pills
                opciones={[
                  { v: "quite", t: "Hasta que lo quite" },
                  { v: "fecha", t: "Hasta una fecha" },
                ]}
                valor={form.hastaModo}
                onChange={(v) => set({ hastaModo: v })}
              />
              {form.hastaModo === "fecha" && (
                <>
                  <input type="date" value={form.hasta} min={hoy} onChange={(e) => set({ hasta: e.target.value })} style={{ marginTop: 8 }} />
                  <div className="hint-text">Ese es el último día que sale.</div>
                </>
              )}
            </>
          )}

          {form.tipo === "repite" && (
            <>
              <label>¿Cada cuánto?</label>
              <Pills
                opciones={[
                  { v: "dia", t: "Cada día" },
                  { v: "semana", t: "Cada semana" },
                  { v: "mes", t: "Cada mes" },
                ]}
                valor={form.cada}
                onChange={(v) => set({ cada: v })}
              />
              {form.cada === "semana" && (
                <>
                  <label>¿Qué día?</label>
                  <Pills opciones={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ v: d, t: DIAS_SEMANA[d] }))} valor={Number(form.dia_semana)} onChange={(v) => set({ dia_semana: v })} />
                </>
              )}
              {form.cada === "mes" && (
                <>
                  <label>¿Qué día del mes?</label>
                  <select value={form.dia_mes} onChange={(e) => set({ dia_mes: Number(e.target.value) })}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {form.dia_mes > 28 && <div className="hint-text">En los meses más cortos sale el último día del mes.</div>}
                </>
              )}
            </>
          )}

          {form.tipo === "una_vez" && (
            <>
              <label>
                ¿Qué día? <span className="req">*</span>
              </label>
              <input type="date" value={form.fecha} min={editandoId ? undefined : hoy} onChange={(e) => set({ fecha: e.target.value })} />
            </>
          )}

          <label>¿A quién le sale?</label>
          <Pills
            opciones={[
              { v: "todos", t: "A todos (menos los técnicos)" },
              { v: "escoger", t: "Escoger personas" },
            ]}
            valor={form.aQuien}
            onChange={(v) => set({ aQuien: v })}
          />
          {form.aQuien === "escoger" && (
            <div style={{ marginTop: 6 }}>
              {personas.map((p) => (
                <label key={p.id} className="af-persona">
                  <input
                    type="checkbox"
                    checked={form.para.includes(p.id)}
                    onChange={(e) => set({ para: e.target.checked ? [...form.para, p.id] : form.para.filter((x) => x !== p.id) })}
                  />
                  {p.full_name || "—"}
                  <small>{p.es_titular ? " · Titular" : p.is_admin ? " · administrador" : esTecnicoPerfil(p) ? " · técnico" : ""}</small>
                </label>
              ))}
            </div>
          )}

          <label>¿Quieres saber quién lo leyó?</label>
          <Pills
            opciones={[
              { v: false, t: "No" },
              { v: true, t: 'Sí, con botón "Listo"' },
            ]}
            valor={!!form.pide_listo}
            onChange={(v) => set({ pide_listo: v })}
          />
          <div className="hint-text">
            {form.pide_listo
              ? 'A cada persona le sale el botón "Listo". Cuando lo toca, se le quita y a ti te llega al celular y por correo. Aquí ves quién lo leyó y quién falta.'
              : "Sale sin botón, hasta la fecha o hasta que lo quites. No te llega nada."}
          </div>

          {form.tipo === "una_vez" && form.pide_listo && (
            <>
              <label>Si no lo marcan ese día</label>
              <Pills
                opciones={[
                  { v: false, t: "Solo ese día" },
                  { v: true, t: 'Sigue saliendo hasta que lo marquen' },
                ]}
                valor={!!form.sigue_hasta_listo}
                onChange={(v) => set({ sigue_hasta_listo: v })}
              />
            </>
          )}

          {error && <div className="error-box">{error}</div>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary" style={{ width: "auto" }} disabled={guardando} onClick={guardar}>
              {guardando ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear aviso"}
            </button>
            <button type="button" className="btn secondary" style={{ width: "auto" }} disabled={guardando} onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!form && error && <div className="error-box">{error}</div>}

      <div className="card">
        {activos.length ? activos.map((a) => tarjeta(a)) : <div className="empty">No hay avisos en {nombreApp}.</div>}
      </div>

      {quitados.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button type="button" className="btn secondary af-mini" onClick={() => setVerQuitados((v) => !v)}>
            {verQuitados ? "Esconder los quitados" : `Ver los quitados (${quitados.length})`}
          </button>
          {verQuitados && <div className="card" style={{ marginTop: 10, opacity: 0.85 }}>{quitados.map((a) => tarjeta(a, true))}</div>}
        </div>
      )}
    </div>
  );
}
