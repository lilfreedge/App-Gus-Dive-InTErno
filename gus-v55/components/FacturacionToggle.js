"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Control ligero de facturación para un llenado de tanque (V5). Solo se
// muestra a quienes tienen el permiso "facturacion" (o son Titular/Admin,
// ver app/tanques/page.js). No es una edición/borrado del registro
// principal, así que no pasa por registrarCambio (audit log) ni por
// RegistroActions: es un detalle de facturación que se puede corregir
// libremente sin dejar motivo de anulación.
export default function FacturacionToggle({ registro }) {
  const router = useRouter();
  const supabase = createClient();
  const [editando, setEditando] = useState(false);
  const [facturaNo, setFacturaNo] = useState(registro.factura_no || "");
  const [loading, setLoading] = useState(false);

  async function guardarFacturado(facturado) {
    setLoading(true);
    await supabase
      .from("llenados_tanques")
      .update({
        facturado,
        factura_no: facturado ? facturaNo.trim() || null : null,
      })
      .eq("id", registro.id);
    setLoading(false);
    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type="text"
          value={facturaNo}
          onChange={(e) => setFacturaNo(e.target.value)}
          placeholder="No. de factura"
          style={{ width: 110, padding: "4px 8px", fontSize: 12 }}
          autoFocus
          disabled={loading}
        />
        <button
          type="button"
          className="chip-btn"
          disabled={loading || !facturaNo.trim()}
          onClick={() => guardarFacturado(true)}
        >
          Guardar
        </button>
        <button
          type="button"
          className="chip-btn"
          disabled={loading}
          onClick={() => setEditando(false)}
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (registro.facturado) {
    return (
      <button
        type="button"
        className="badge"
        style={{ border: "none", cursor: "pointer" }}
        onClick={() => setEditando(true)}
        disabled={loading}
        title="Cambiar No. de factura"
      >
        Facturado{registro.factura_no ? ` #${registro.factura_no}` : ""}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="badge badge-rojo"
      style={{ border: "none", cursor: "pointer" }}
      onClick={() => setEditando(true)}
      disabled={loading}
    >
      Pendiente por facturar
    </button>
  );
}
