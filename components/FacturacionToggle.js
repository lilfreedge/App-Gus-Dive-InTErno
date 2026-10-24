"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconReceipt, IconCheck } from "@/components/icons";

// Facturación de un llenado de tanque (V5). Solo se muestra a quienes tienen
// el permiso "facturacion" (el Titular siempre, ver app/tanques/page.js). No
// es una edición/borrado del registro principal, así que no pasa por
// registrarCambio (audit log) ni por RegistroActions.
//
// V35 (pedido explícito: "quiero poner ese botón de manera que se pueda
// ver, el de facturar"; maqueta-facturar-buscadores.html, opción "A"): es
// una línea propia abajo del llenado. Pendiente: etiqueta roja + botón
// "Facturar". Al tocarlo, el No. de factura se escribe en esa misma línea.
// Ya facturado: etiqueta verde "Facturado · No." + "Cambiar".
// Si la base de datos no deja guardar, ahora sale el aviso (antes no decía
// nada y parecía que había guardado -- ver migration_67.sql).
export default function FacturacionToggle({ registro }) {
  const router = useRouter();
  const supabase = createClient();
  const [editando, setEditando] = useState(false);
  const [facturaNo, setFacturaNo] = useState(registro.factura_no || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function guardarFacturado() {
    const numero = facturaNo.trim();
    if (!numero) return setError("Escribe el No. de factura.");
    setLoading(true);
    setError("");
    const { data, error: err } = await supabase
      .from("llenados_tanques")
      .update({ facturado: true, factura_no: numero })
      .eq("id", registro.id)
      .select("id");
    setLoading(false);
    if (err) return setError(err.message || "No se pudo guardar.");
    if (!data || data.length === 0) {
      return setError("No se guardó: no tienes permiso para facturar llenados. Pídeselo al Titular.");
    }
    setEditando(false);
    router.refresh();
  }

  const linea = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px dashed var(--borde)",
  };

  if (editando) {
    return (
      <div style={linea}>
        <label htmlFor={`factura-${registro.id}`} style={{ marginTop: 0 }}>
          No. de factura
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id={`factura-${registro.id}`}
            type="text"
            value={facturaNo}
            onChange={(e) => setFacturaNo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardarFacturado();
            }}
            placeholder="Ej. F-120"
            style={{ marginTop: 0, flex: "1 1 160px", minWidth: 0 }}
            autoFocus
            disabled={loading}
          />
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading || !facturaNo.trim()}
            onClick={guardarFacturado}
            style={{ marginTop: 0, width: "auto" }}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={loading}
            onClick={() => {
              setEditando(false);
              setError("");
              setFacturaNo(registro.factura_no || "");
            }}
            style={{ marginTop: 0, width: "auto" }}
          >
            Cancelar
          </button>
        </div>
        {error && <div className="error-box" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    );
  }

  if (registro.facturado) {
    return (
      <div style={{ ...linea, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span className="badge badge-verde" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IconCheck size={12} /> Facturado{registro.factura_no ? ` · ${registro.factura_no}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--azul-claro)", fontWeight: 700, fontSize: 12.5 }}
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...linea, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span className="badge badge-rojo">Pendiente por facturar</span>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => setEditando(true)}
        style={{ marginTop: 0, width: "auto", padding: "7px 14px", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <IconReceipt size={15} /> Facturar
      </button>
    </div>
  );
}
