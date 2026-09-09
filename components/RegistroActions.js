"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";
import { IconEdit, IconTrash } from "./icons";

export default function RegistroActions({ tabla, registro, editHref }) {
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
    router.refresh();
  }

  return (
    <div className="row-actions">
      <Link href={editHref} className="icon-btn" aria-label="Editar" title="Editar">
        <IconEdit size={15} />
      </Link>
      <button
        className="icon-btn icon-btn-danger"
        onClick={abrirModal}
        disabled={loading}
        aria-label="Borrar"
        title="Borrar"
      >
        <IconTrash size={15} />
      </button>

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
