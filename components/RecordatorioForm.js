"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_REINICIO } from "@/lib/recordatorios";

// V37 -- Crear / editar un recordatorio de compresores (plan-v37.html 2C,
// "me gusta a"). Solo el Titular y los administradores llegan aquí.
export default function RecordatorioForm({ recordatorio = null, compresores = [], usuarios = [], miNombre = "" }) {
  const router = useRouter();
  const supabase = createClient();
  const r = recordatorio;

  const modoInicial = !r || r.compresor_ids === null ? "todos" : r.compresor_ids.length === 0 ? "ninguno" : "algunos";
  const [titulo, setTitulo] = useState(r?.titulo || "");
  const [cada, setCada] = useState(String(r?.cada ?? ""));
  const [unidad, setUnidad] = useState(r?.unidad || "dias");
  const [modo, setModo] = useState(modoInicial);
  const [elegidos, setElegidos] = useState(r?.compresor_ids || []);
  const [reinicia, setReinicia] = useState(r?.reinicia || "Inspección");
  const [avisarAntes, setAvisarAntes] = useState(String(r?.avisar_antes ?? 2));
  const [usuarioIds, setUsuarioIds] = useState(r?.usuario_ids || []);
  const [activo, setActivo] = useState(r ? r.activo !== false : true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  const unidadTexto = unidad === "horas" ? "horas" : "días";

  function alternar(lista, setLista, id) {
    setLista(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);
  }

  async function guardar(e) {
    e.preventDefault();
    setError("");
    const n = parseInt(cada, 10);
    const antes = parseInt(avisarAntes, 10);
    if (!titulo.trim()) return setError("Escribe qué hay que hacer.");
    if (!n || n < 1) return setError("Pon cada cuántos días u horas.");
    if (Number.isNaN(antes) || antes < 0) return setError("Pon con cuánto tiempo de anticipación avisa (0 si no hace falta).");
    if (modo === "algunos" && elegidos.length === 0) return setError("Marca al menos un compresor.");
    if (modo === "ninguno" && unidad === "horas") {
      return setError("Por horas del horómetro tiene que ir con un compresor.");
    }
    if (modo === "ninguno" && reinicia !== "hecho") {
      return setError('Si no va con un compresor, se reinicia cuando alguien toca "Hecho".');
    }
    if (usuarioIds.length === 0) return setError("Marca a quién le sale.");

    const datos = {
      titulo: titulo.trim(),
      cada: n,
      unidad,
      compresor_ids: modo === "todos" ? null : modo === "ninguno" ? [] : elegidos,
      reinicia,
      avisar_antes: antes,
      usuario_ids: usuarioIds,
      activo,
    };

    setLoading(true);
    let res;
    if (r) {
      res = await supabase
        .from("recordatorios_compresores")
        .update({ ...datos, updated_at: new Date().toISOString() })
        .eq("id", r.id)
        .select("id");
    } else {
      res = await supabase
        .from("recordatorios_compresores")
        .insert({ ...datos, creado_por_nombre: miNombre || null })
        .select("id");
    }
    setLoading(false);
    if (res.error || !res.data || res.data.length === 0) {
      return setError(res.error?.message || "No se pudo guardar. Solo el Titular y los administradores pueden.");
    }
    router.push("/equipos/compresores/recordatorios");
    router.refresh();
  }

  async function borrar() {
    setLoading(true);
    const { data, error: err } = await supabase.from("recordatorios_compresores").delete().eq("id", r.id).select("id");
    setLoading(false);
    if (err || !data || data.length === 0) return setError(err?.message || "No se pudo borrar.");
    router.push("/equipos/compresores/recordatorios");
    router.refresh();
  }

  const chk = { width: 17, height: 17, margin: 0, flexShrink: 0 };
  const fila = {
    display: "flex",
    gap: 8,
    alignItems: "center",
    margin: 0,
    padding: "6px 0",
    fontWeight: 500,
    fontSize: 14,
  };

  return (
    <form onSubmit={guardar} className="card">
      <label htmlFor="titulo" style={{ marginTop: 0 }}>
        ¿Qué hay que hacer? <span className="req">*</span>
      </label>
      <input id="titulo" type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Inspección" />

      <label htmlFor="cada">
        Cada <span className="req">*</span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="cada"
          type="number"
          min="1"
          inputMode="numeric"
          value={cada}
          onChange={(e) => setCada(e.target.value)}
          style={{ width: 100, marginTop: 0 }}
        />
        <select value={unidad} onChange={(e) => setUnidad(e.target.value)} style={{ flex: 1, marginTop: 0 }}>
          <option value="dias">días</option>
          <option value="horas">horas del horómetro</option>
        </select>
      </div>

      <label>¿A qué compresores?</label>
      <label style={fila}>
        <input type="radio" name="modo" checked={modo === "todos"} onChange={() => setModo("todos")} style={chk} />
        Todos los compresores
      </label>
      <label style={fila}>
        <input type="radio" name="modo" checked={modo === "algunos"} onChange={() => setModo("algunos")} style={chk} />
        Solo algunos
      </label>
      {modo === "algunos" && (
        <div style={{ paddingLeft: 26 }}>
          {compresores.map((c) => (
            <label key={c.id} style={fila}>
              <input type="checkbox" checked={elegidos.includes(c.id)} onChange={() => alternar(elegidos, setElegidos, c.id)} style={chk} />
              {c.codigo}
              {c.descripcion ? <span style={{ color: "var(--texto-suave)", fontSize: 12.5 }}>· {c.descripcion}</span> : null}
              {c.activo === false && <span className="badge badge-rojo">Inactivo</span>}
            </label>
          ))}
        </div>
      )}
      <label style={fila}>
        <input
          type="radio"
          name="modo"
          checked={modo === "ninguno"}
          onChange={() => {
            setModo("ninguno");
            setReinicia("hecho");
            setUnidad("dias");
          }}
          style={chk}
        />
        No va con un compresor (ej. limpiar el cuarto)
      </label>

      <label htmlFor="reinicia">Se reinicia cuando</label>
      <select id="reinicia" value={reinicia} onChange={(e) => setReinicia(e.target.value)} disabled={modo === "ninguno"}>
        {TIPOS_REINICIO.map((t) => (
          <option key={t} value={t}>
            se registra {t === "Inspección" ? "una" : "un"} {t}
          </option>
        ))}
        <option value="hecho">alguien toca &quot;Hecho&quot;</option>
      </select>

      <label htmlFor="avisar">Avisar desde</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          id="avisar"
          type="number"
          min="0"
          inputMode="numeric"
          value={avisarAntes}
          onChange={(e) => setAvisarAntes(e.target.value)}
          style={{ width: 100, marginTop: 0 }}
        />
        <span style={{ fontSize: 14 }}>{unidadTexto} antes</span>
      </div>

      <label>¿A quién le sale?</label>
      <div style={{ display: "flex", gap: 12, margin: "4px 0 2px" }}>
        <button
          type="button"
          onClick={() => setUsuarioIds(usuarios.map((u) => u.id))}
          style={{ background: "none", border: "none", padding: 0, color: "var(--azul-claro)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
        >
          Marcar todos
        </button>
        <button
          type="button"
          onClick={() => setUsuarioIds([])}
          style={{ background: "none", border: "none", padding: 0, color: "var(--azul-claro)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
        >
          Ninguno
        </button>
      </div>
      {usuarios.map((u) => (
        <label key={u.id} style={fila}>
          <input type="checkbox" checked={usuarioIds.includes(u.id)} onChange={() => alternar(usuarioIds, setUsuarioIds, u.id)} style={chk} />
          {u.full_name}
          {!u.veCompresores && (
            <span className="hint-text" style={{ margin: 0 }}>
              (no ve Compresores: le sale solo en Inicio)
            </span>
          )}
        </label>
      ))}

      <label style={{ ...fila, marginTop: 14 }}>
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} style={chk} />
        Encendido
      </label>

      {error && <div className="error-box">{error}</div>}

      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Guardando..." : "Guardar"}
      </button>

      {r && (
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px dashed var(--borde)" }}>
          {!confirmarBorrar ? (
            <button
              type="button"
              onClick={() => setConfirmarBorrar(true)}
              style={{ background: "none", border: "none", padding: 0, color: "var(--rojo)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Borrar este recordatorio
            </button>
          ) : (
            <div>
              <div style={{ fontSize: 13.5, marginBottom: 8 }}>
                ¿Seguro? Se borra el recordatorio y deja de salirle a todos. No se puede deshacer.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn danger" disabled={loading} onClick={borrar} style={{ marginTop: 0, width: "auto" }}>
                  Sí, borrar
                </button>
                <button type="button" className="btn secondary" onClick={() => setConfirmarBorrar(false)} style={{ marginTop: 0, width: "auto" }}>
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
