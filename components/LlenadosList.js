"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RegistroActions from "@/components/RegistroActions";
import FacturacionToggle from "@/components/FacturacionToggle";
import { formatFecha } from "@/lib/format";

// Lista de llenados (V5). Además del control de facturación por fila
// (FacturacionToggle), quien tiene el permiso "facturacion" puede activar
// "Facturar varios" para marcar como facturados varios llenados a la vez
// con un solo número de factura. Igual que FacturacionToggle, esto es un
// detalle de facturación (no una edición/borrado del registro principal),
// así que tampoco pasa por registrarCambio / audit log.
export default function LlenadosList({ llenados, puedeEditar, puedeFacturar, puedeRegistrar }) {
  const router = useRouter();
  const supabase = createClient();
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [seleccionados, setSeleccionados] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [facturaNo, setFacturaNo] = useState("");
  const [facturaNoError, setFacturaNoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soloPendientes, setSoloPendientes] = useState(false);

  function activarModoSeleccion() {
    setModoSeleccion(true);
    setSeleccionados([]);
  }

  function cancelarModoSeleccion() {
    setModoSeleccion(false);
    setSeleccionados([]);
  }

  function toggleSeleccionado(id) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function abrirModal() {
    if (seleccionados.length === 0) return;
    setFacturaNo("");
    setFacturaNoError(false);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (loading) return;
    setModalAbierto(false);
  }

  async function handleConfirmar() {
    const facturaNoLimpio = facturaNo.trim();
    if (!facturaNoLimpio) {
      setFacturaNoError(true);
      return;
    }

    setLoading(true);

    await supabase
      .from("llenados_tanques")
      .update({ facturado: true, factura_no: facturaNoLimpio })
      .in("id", seleccionados);

    setLoading(false);
    setModalAbierto(false);
    setModoSeleccion(false);
    setSeleccionados([]);
    router.refresh();
  }

  const noFacturados = (llenados || []).filter((t) => !t.facturado);
  const visibles = soloPendientes ? noFacturados : llenados;

  return (
    <>
      {(puedeRegistrar || puedeFacturar) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          {puedeRegistrar && (
            <Link href="/tanques/nuevo">
              <button className="btn btn-primary" type="button" style={{ width: "auto", margin: 0 }}>
                + Registrar llenados
              </button>
            </Link>
          )}
          {puedeFacturar && (
            <button
              type="button"
              className="btn secondary"
              style={
                soloPendientes
                  ? { width: "auto", margin: 0, background: "var(--azul)", color: "#fff", borderColor: "var(--azul)" }
                  : { width: "auto", margin: 0 }
              }
              onClick={() => setSoloPendientes((v) => !v)}
            >
              Por facturar
            </button>
          )}
        </div>
      )}

      {puedeFacturar && noFacturados.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {!modoSeleccion ? (
            <button type="button" className="chip-btn" onClick={activarModoSeleccion}>
              Facturar varios
            </button>
          ) : (
            <>
              <button type="button" className="chip-btn" onClick={cancelarModoSeleccion}>
                Cancelar selección
              </button>
              <span className="badge">{seleccionados.length} seleccionado{seleccionados.length === 1 ? "" : "s"}</span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: "auto", margin: 0, padding: "8px 16px" }}
                disabled={seleccionados.length === 0}
                onClick={abrirModal}
              >
                Marcar como facturado
              </button>
            </>
          )}
        </div>
      )}

      <div className="card">
        {visibles && visibles.length > 0 ? (
          visibles.map((t) => (
            <div className="list-item" key={t.id}>
              <div className="list-item-top">
                <span className="list-item-title" style={{ display: "flex", alignItems: "center" }}>
                  {modoSeleccion && !t.facturado && (
                    <input
                      type="checkbox"
                      style={{ width: "auto", marginRight: 8 }}
                      checked={seleccionados.includes(t.id)}
                      onChange={() => toggleSeleccionado(t.id)}
                    />
                  )}
                  <span className="folio-tag">#{t.folio}</span>
                  Llenados de tanque
                  <span className="badge">{t.tipo_gas}</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className="list-item-qty">{t.cantidad} tanque(s)</span>
                  {puedeFacturar && !modoSeleccion && <FacturacionToggle registro={t} />}
                  {puedeEditar && (
                    <RegistroActions
                      tabla="llenados_tanques"
                      registro={t}
                      editHref={`/tanques/${t.id}/editar`}
                    />
                  )}
                </div>
              </div>
              <div className="list-item-meta">
                {t.full_name} · {formatFecha(t.created_at)}
              </div>
              {t.nota && <div className="list-item-note">{t.nota}</div>}
            </div>
          ))
        ) : (
          <div className="empty">Aún no hay llenados registrados.</div>
        )}
      </div>

      {modalAbierto && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="modal-panel">
            <div className="modal-title">Facturar {seleccionados.length} llenado{seleccionados.length === 1 ? "" : "s"}</div>
            <div className={facturaNoError ? "field-error" : ""}>
              <label style={{ marginTop: 14 }}>
                No. de factura <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="No. de factura"
                value={facturaNo}
                onChange={(e) => {
                  setFacturaNo(e.target.value);
                  if (facturaNoError && e.target.value.trim()) setFacturaNoError(false);
                }}
                disabled={loading}
                autoFocus
              />
              {facturaNoError && (
                <div className="error-msg">⚠ Este campo es obligatorio</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={cerrarModal} disabled={loading} type="button">
                Cancelar
              </button>
              <button className="btn btn-primary" style={{ width: "auto", margin: 0 }} onClick={handleConfirmar} disabled={loading} type="button">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
