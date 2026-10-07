"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ArticuloCombobox from "@/app/salidas/ArticuloCombobox";

let siguienteClave = 1;
const filaVacia = () => ({ clave: siguienteClave++, articuloId: "", cantidad: "1" });

// Varios códigos del catálogo, cada uno con su cantidad, y una sola nota
// para toda la solicitud (pedido explícito: "se piden códigos y
// cantidades, del mismo catalogo... se pueden pedir varias piezas en una
// misma solicitud"; la nota "por la solicitud completa"). Se guarda todo
// de una vez con crear_solicitud_almacen (migration_52.sql) y después se
// le avisa al almacén por correo (/api/solicitudes/[id]/avisar).
export default function NuevaSolicitudForm({ articulos, hayCorreosAlmacen }) {
  const router = useRouter();
  const supabase = createClient();
  const [filas, setFilas] = useState(() => [filaVacia()]);
  const [nota, setNota] = useState("");
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  const porId = new Map(articulos.map((a) => [a.id, a]));

  function cambiarFila(clave, cambios) {
    setFilas((fs) => fs.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)));
  }

  function validar() {
    const e = {};
    const vistos = new Set();
    filas.forEach((f) => {
      if (!f.articuloId) e[f.clave] = "Elige un código de la lista.";
      else if (vistos.has(f.articuloId)) e[f.clave] = "Ese código ya está en la solicitud.";
      else {
        const n = Number(f.cantidad);
        if (!Number.isInteger(n) || n < 1) e[f.clave] = "La cantidad debe ser un número entero mayor que 0.";
      }
      if (f.articuloId) vistos.add(f.articuloId);
    });
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setErrorGeneral("");
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    const { data, error } = await supabase.rpc("crear_solicitud_almacen", {
      p_nota: nota,
      p_items: filas.map((f) => ({ articulo_id: f.articuloId, cantidad: Number(f.cantidad) })),
    });
    if (error || !data?.[0]) {
      setEnviando(false);
      setErrorGeneral(error?.message || "No se pudo enviar la solicitud. Intenta de nuevo.");
      return;
    }
    const { nuevo_id, nuevo_folio } = data[0];

    // El aviso al almacén no bloquea: si falla, la solicitud ya quedó
    // guardada y se ve el motivo en la lista, con "Reintentar aviso".
    try {
      await fetch(`/api/solicitudes/${nuevo_id}/avisar`, { method: "POST" });
    } catch {
      // se ve en la lista
    }

    router.push(`/solicitudes?creada=${nuevo_folio}`);
    router.refresh();
  }

  if (articulos.length === 0) {
    return (
      <div className="card">
        <div className="empty">Todavía no hay códigos en el catálogo.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card" noValidate>
      <label style={{ marginTop: 0 }}>
        Códigos <span style={{ color: "var(--rojo)" }}>*</span>
      </label>
      {filas.map((f) => (
        <div key={f.clave} style={{ marginBottom: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 84px auto", gap: 8, alignItems: "start" }}>
            <ArticuloCombobox
              articulos={articulos}
              articuloId={f.articuloId}
              onChange={(id) => cambiarFila(f.clave, { articuloId: id })}
              hasError={!!errores[f.clave]}
            />
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Cantidad"
              value={f.cantidad}
              onChange={(e) => cambiarFila(f.clave, { cantidad: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setFilas((fs) => (fs.length > 1 ? fs.filter((x) => x.clave !== f.clave) : fs))}
              disabled={filas.length === 1}
              style={{ background: "none", border: "none", color: filas.length === 1 ? "var(--borde)" : "var(--rojo)", fontWeight: 600, fontSize: 12.5, padding: "12px 4px", cursor: filas.length === 1 ? "default" : "pointer" }}
            >
              Quitar
            </button>
          </div>
          {f.articuloId && porId.get(f.articuloId)?.descripcion && (
            <div className="hint-text" style={{ marginTop: 3 }}>{porId.get(f.articuloId).descripcion}</div>
          )}
          {errores[f.clave] && <div className="error-msg">⚠ {errores[f.clave]}</div>}
        </div>
      ))}
      <button
        type="button"
        className="btn secondary"
        onClick={() => setFilas((fs) => [...fs, filaVacia()])}
        style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
      >
        + Agregar otro código
      </button>

      <label htmlFor="nota">Nota (opcional)</label>
      <textarea
        id="nota"
        rows={3}
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Ej. Para los mantenimientos de esta semana"
      />

      {errorGeneral && <div className="error-box">{errorGeneral}</div>}

      <button className="btn btn-primary" type="submit" disabled={enviando} style={{ marginTop: 16 }}>
        {enviando ? "Enviando..." : "Enviar solicitud"}
      </button>
      <div className="hint-text" style={{ textAlign: "center", marginTop: 6 }}>
        {hayCorreosAlmacen
          ? "Se le avisa al almacén por correo con la lista de códigos."
          : "Todavía no hay un correo del almacén configurado (Administración › Solicitudes al almacén) -- la solicitud se guarda igual, pero no se le avisa a nadie."}
      </div>
    </form>
  );
}
