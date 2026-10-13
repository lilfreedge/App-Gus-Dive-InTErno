"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Acción irreversible: borra registros y reinicia numeración (folio)
// desde 1. Antes borraba siempre TODO (salidas + llenados) sin poder
// elegir; se volvió granular (checkbox por categoría) el mismo día que
// se construyó su versión para App Clientes, a pedido explícito del
// usuario para esa: "Hazlo similar para el app interno" -- misma idea
// acá, sin agregar categorías nuevas (esto nunca tocó compresores,
// inspecciones, etc., y no se pidió ampliar el alcance). Los textos de
// las 3 confirmaciones encadenadas son intencionales, tal cual los pidió
// el dueño de la app -- no cambiarlos; se agregó una primera
// confirmación informativa (nueva, dinámica según lo marcado) porque
// ahora sí hay una elección real que avisar antes de esas 3.
const CATEGORIAS = [
  { clave: "salidas", label: "Salidas", detalle: "Borra todas las salidas (piezas/ring) y reinicia su numeración." },
  {
    clave: "llenados",
    label: "Llenados de tanque",
    detalle: "Borra todos los llenados de tanque y reinicia su numeración.",
  },
];

export default function FormatearRegistros() {
  const router = useRouter();
  const supabase = createClient();
  const [marcadas, setMarcadas] = useState({});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function handleClick() {
    const seleccionadas = CATEGORIAS.filter((c) => marcadas[c.clave]);
    if (seleccionadas.length === 0) {
      setMensaje({ tipo: "error", texto: "Selecciona al menos una categoría para borrar." });
      return;
    }

    const listado = seleccionadas.map((c) => c.label).join(", ");
    if (
      !window.confirm(
        `Vas a borrar PERMANENTEMENTE: ${listado}.\n\nEsto no se puede deshacer. ¿Seguro que quieres continuar?`
      )
    )
      return;
    if (!window.confirm("¿Tú ta seguro broth? Se borra to'")) return;
    if (!window.confirm("¿SEGURO???????")) return;
    if (!window.confirm("Tato")) return;

    setLoading(true);
    setMensaje(null);

    const { error } = await supabase.rpc("formatear_registros", {
      p_borrar_salidas: !!marcadas.salidas,
      p_borrar_llenados: !!marcadas.llenados,
    });

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo formatear: " + error.message });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Registros formateados." });
    setMarcadas({});
    router.refresh();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--texto-suave)", marginBottom: 12, marginTop: 0 }}>
        Elige qué quieres borrar permanentemente. No se puede deshacer.
      </p>
      {CATEGORIAS.map((c) => (
        <label
          key={c.clave}
          className="check-label"
          style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}
        >
          <input
            type="checkbox"
            checked={!!marcadas[c.clave]}
            disabled={loading}
            onChange={(e) => setMarcadas((prev) => ({ ...prev, [c.clave]: e.target.checked }))}
            style={{ width: "auto", marginTop: 3 }}
          />
          <span>
            <b>{c.label}</b>
            <div style={{ fontSize: 12, color: "var(--texto-suave)" }}>{c.detalle}</div>
          </span>
        </label>
      ))}
      <button
        type="button"
        className="btn danger"
        style={{ width: "auto", marginTop: 6 }}
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? "Formateando..." : "Formatear registros"}
      </button>
      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
