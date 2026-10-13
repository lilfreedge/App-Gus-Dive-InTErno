"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { IconEdit, IconTrash } from "./icons";

// `afterDelete` (26-sep-2026, pedido explícito -- item 7: "editar/anular
// una orden"): en un listado, borrar y quedarse en la misma pantalla
// (router.refresh()) tiene sentido, la fila simplemente desaparece. Pero
// usado dentro de una ficha/detalle, refrescar la misma ruta después de
// borrar el registro que esa ficha muestra rompe (notFound()) -- así que
// si se pasa una ruta, navega ahí en vez de refrescar. Sin este prop, el
// comportamiento no cambia para los usos existentes (listados).
// `mostrarEditar`/`mostrarAnular` (ronda grande de feedback, 27-sep-2026,
// pedido explícito: permiso nuevo y separado para "editar orden"/"editar
// mantenimiento de compresor", distinto del permiso de anular -- que
// sigue siendo Titular/Administrador, según la política de borrado en la
// base de datos) -- ambos por default true, así que los demás usos de
// este componente (App Interno) no cambian.
export default function RegistroActions({ tabla, registro, editHref, afterDelete, mostrarEditar = true, mostrarAnular = true }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState(false);

  function abrirModal() {
    setMotivo("");
    setMotivoError(false);
    setModalAbierto(true);
  }

  function cerrarModal() {
    if (loading) return;
    setModalAbierto(false);
  }

  async function handleConfirmar() {
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setMotivoError(true);
      return;
    }

    setLoading(true);

    await registrarCambio(supabase, {
      tabla,
      registroId: registro.id,
      accion: "borrar",
      datosAnteriores: registro,
      motivo: motivoLimpio,
    });

    const { error } = await supabase.from(tabla).delete().eq("id", registro.id);

    setLoading(false);

    if (error) {
      alert("No se pudo borrar. Intenta de nuevo.");
      return;
    }

    setModalAbierto(false);
    if (afterDelete) {
      router.push(afterDelete);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="row-actions">
      {mostrarEditar && (
        <Link href={editHref} className="icon-btn" aria-label="Editar" title="Editar">
          <IconEdit size={15} />
        </Link>
      )}
      {mostrarAnular && (
        <button
          className="icon-btn icon-btn-danger"
          onClick={abrirModal}
          disabled={loading}
          aria-label="Borrar"
          title="Borrar"
        >
          <IconTrash size={15} />
        </button>
      )}

      {modalAbierto && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModal();
          }}
        >
          <div className="modal-panel">
            <div className="modal-title">Anular registro</div>
            <div className={motivoError ? "field-error" : ""}>
              <label style={{ marginTop: 14 }}>
                Motivo de anulación <span className="req">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explica por qué se anula este registro"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (motivoError && e.target.value.trim()) setMotivoError(false);
                }}
                disabled={loading}
                autoFocus
              />
              {motivoError && (
                <div className="error-msg">⚠ Este campo es obligatorio</div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={cerrarModal} disabled={loading} type="button">
                Cancelar
              </button>
              <button className="btn danger" onClick={handleConfirmar} disabled={loading} type="button">
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
