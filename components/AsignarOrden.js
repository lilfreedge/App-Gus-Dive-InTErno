"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// V34 -- "Asignar órdenes" (maqueta-v34.html, parte B; aprobado). Botón
// que abre la ventana "Asignar la orden No. X": las personas con rol de
// técnico, cuántas órdenes abiertas tiene cada una, y "Sin asignar". Lo
// guarda la base de datos (asignar_orden, migration_66.sql), que también
// lo anota en la Bitácora de la orden. Solo se muestra a quien tiene el
// permiso "Asignar órdenes" (o al Titular).
//
// `estilo`: "chip" (Registro de Órdenes: "Asignar ▾" / "Cambiar", chiquito)
// o "link" (ficha de la orden: "Asignar" / "Cambiar").
export default function AsignarOrden({ ordenId, numero, tecnicoActualId = null, tecnicos = [], estilo = "link" }) {
  const router = useRouter();
  const supabase = createClient();
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState(tecnicoActualId || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function abrir(e) {
    e.preventDefault();
    e.stopPropagation();
    setSel(tecnicoActualId || "");
    setError("");
    setAbierto(true);
  }

  async function guardar() {
    setGuardando(true);
    setError("");
    const { error: err } = await supabase.rpc("asignar_orden", { p_orden: ordenId, p_tecnico: sel || null });
    setGuardando(false);
    if (err) return setError(err.message || "No se pudo asignar.");
    setAbierto(false);
    router.refresh();
  }

  const texto = tecnicoActualId ? "Cambiar" : estilo === "chip" ? "Asignar ▾" : "Asignar";

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--azul-claro)",
          fontWeight: 700,
          fontSize: estilo === "chip" ? 12 : 13,
        }}
      >
        {texto}
      </button>

      {abierto && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setAbierto(false);
          }}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Asignar la orden No. {numero}</div>
            {tecnicos.length === 0 && (
              <div className="aviso-box" style={{ marginTop: 10 }}>
                Todavía nadie tiene un rol de técnico. En Administración › Roles, el rol tiene que tener la Pantalla de
                inicio &quot;Mis órdenes asignadas&quot;; después se lo pones a la persona en Permisos.
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              {[...tecnicos.map((t) => ({ id: t.id, nombre: t.full_name, abiertas: t.abiertas })), { id: "", nombre: "Sin asignar" }].map(
                (t) => (
                  <label
                    key={t.id || "ninguno"}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 2px",
                      borderBottom: "1px solid var(--borde)",
                      margin: 0,
                      fontWeight: 500,
                      fontSize: 14,
                      color: "var(--texto)",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <input
                        type="radio"
                        name={`asignar-${ordenId}`}
                        checked={sel === t.id}
                        onChange={() => setSel(t.id)}
                        style={{ width: 17, height: 17, margin: 0 }}
                      />
                      {t.nombre}
                      {t.id && t.id === tecnicoActualId && <span className="tag-tu">Ahora</span>}
                    </span>
                    {t.id && (
                      <span className="hint-text" style={{ margin: 0 }}>
                        {t.abiertas} orden{t.abiertas === 1 ? "" : "es"} abierta{t.abiertas === 1 ? "" : "s"}
                      </span>
                    )}
                  </label>
                )
              )}
            </div>
            <div className="hint-text" style={{ marginTop: 8 }}>
              Queda anotado en la bitácora de la orden. Cualquiera con &quot;Actualizar estado de orden&quot; la puede seguir
              actualizando.
            </div>
            {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn secondary" type="button" onClick={() => setAbierto(false)} disabled={guardando}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={guardar}
                disabled={guardando || sel === (tecnicoActualId || "")}
              >
                {guardando ? "Guardando..." : "Asignar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
