"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_MANUAL } from "@/lib/manuales";

// V51 -- Agregar o editar un manual (maqueta-v51-todo-junto.html, pestaña 3).
// El PDF va a la carpeta privada "manuales"; o se pega un enlace.
export default function ManualForm({ manual = null, volverA = "/manuales" }) {
  const router = useRouter();
  const supabase = createClient();
  const [tipo, setTipo] = useState(manual?.tipo || "Reguladores");
  const [marca, setMarca] = useState(manual?.marca || "");
  const [modelos, setModelos] = useState(manual?.modelos || "");
  const [descripcion, setDescripcion] = useState(manual?.descripcion || "");
  const [modo, setModo] = useState(manual?.url ? "link" : "pdf");
  const [url, setUrl] = useState(manual?.url || "");
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [quitando, setQuitando] = useState(false);

  async function guardar() {
    setError("");
    if (!marca.trim()) return setError("Escribe la marca.");
    if (!modelos.trim()) return setError("Escribe el modelo (o los modelos, separados por coma).");
    if (modo === "link" && !/^https?:\/\//i.test(url.trim())) return setError("Pega el enlace completo (empieza con https://).");
    if (modo === "pdf" && !archivo && !manual?.archivo_path) return setError("Escoge el PDF del manual.");
    if (archivo && archivo.size > 50 * 1024 * 1024) return setError("El PDF pesa más de 50 MB. Prueba con uno más liviano o pega un enlace.");
    setGuardando(true);
    try {
      let archivo_path = modo === "pdf" ? manual?.archivo_path || null : null;
      if (modo === "pdf" && archivo) {
        const ruta = `${crypto.randomUUID()}.pdf`;
        const { error: eSubir } = await supabase.storage.from("manuales").upload(ruta, archivo, { contentType: "application/pdf" });
        if (eSubir) throw new Error("No se pudo subir el PDF. Intenta de nuevo.");
        archivo_path = ruta;
      }
      const fila = {
        tipo,
        marca: marca.trim(),
        modelos: modelos
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .join(", "),
        descripcion: descripcion.trim() || null,
        url: modo === "link" ? url.trim() : null,
        archivo_path,
        actualizado_en: new Date().toISOString(),
      };
      const { error: e } = manual
        ? await supabase.from("manuales").update(fila).eq("id", manual.id)
        : await supabase.from("manuales").insert(fila);
      if (e) throw new Error("No se pudo guardar. Intenta de nuevo.");
      router.push(volverA);
      router.refresh();
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  async function quitar() {
    setGuardando(true);
    const { error: e } = await supabase.from("manuales").delete().eq("id", manual.id);
    if (e) {
      setGuardando(false);
      return setError("No se pudo quitar. Intenta de nuevo.");
    }
    router.push(volverA);
    router.refresh();
  }

  const pill = (sel) => (sel ? "sel" : "");
  return (
    <div className="card">
      <label style={{ marginTop: 0 }}>Tipo de equipo</label>
      <div className="af-pills">
        {TIPOS_MANUAL.map((t) => (
          <button key={t} type="button" className={pill(tipo === t)} onClick={() => setTipo(t)}>
            {t}
          </button>
        ))}
      </div>
      <label>
        Marca <span className="req">*</span>
      </label>
      <input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ej. Scubapro" />
      <label>
        Modelo(s) <span className="req">*</span>
      </label>
      <input value={modelos} onChange={(e) => setModelos(e.target.value)} placeholder="Ej. MK25, S600" />
      <div className="hint-text">Varios modelos separados por coma: el atajo sale en las órdenes y fichas de cualquiera de ellos.</div>
      <label>Descripción (opcional)</label>
      <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Manual de servicio" />
      <label>El manual</label>
      <div className="af-pills">
        <button type="button" className={pill(modo === "pdf")} onClick={() => setModo("pdf")}>
          Subir PDF
        </button>
        <button type="button" className={pill(modo === "link")} onClick={() => setModo("link")}>
          Pegar un enlace
        </button>
      </div>
      {modo === "pdf" ? (
        <>
          <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files?.[0] || null)} style={{ marginTop: 8 }} />
          {manual?.archivo_path && !archivo && <div className="hint-text">Ya tiene un PDF. Escoge otro solo si lo quieres cambiar.</div>}
        </>
      ) : (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" style={{ marginTop: 8 }} />
      )}
      {error && <div className="error-box">{error}</div>}
      <button type="button" className="btn btn-primary" disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando..." : "Guardar manual"}
      </button>
      {manual && (
        <div style={{ marginTop: 14 }}>
          {quitando ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span className="hint-text" style={{ margin: 0 }}>
                ¿Quitar este manual? Deja de salir en los dos apps.
              </span>
              <button type="button" className="btn danger af-mini" disabled={guardando} onClick={quitar}>
                Sí, quitar
              </button>
              <button type="button" className="btn secondary af-mini" onClick={() => setQuitando(false)}>
                No
              </button>
            </div>
          ) : (
            <button type="button" className="btn secondary af-mini" style={{ color: "var(--rojo)" }} onClick={() => setQuitando(true)}>
              Quitar manual
            </button>
          )}
        </div>
      )}
    </div>
  );
}
