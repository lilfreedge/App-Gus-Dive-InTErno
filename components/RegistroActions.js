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

  async function handleDelete() {
    const ok = window.confirm(
      "¿Seguro que quieres borrar este registro? Esta acción no se puede deshacer, pero queda anotada en el historial de cambios."
    );
    if (!ok) return;

    setLoading(true);

    await registrarCambio(supabase, {
      tabla,
      registroId: registro.id,
      accion: "borrar",
      datosAnteriores: registro,
    });

    const { error } = await supabase.from(tabla).delete().eq("id", registro.id);

    setLoading(false);

    if (error) {
      alert("No se pudo borrar. Intenta de nuevo.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="row-actions">
      <Link href={editHref} className="icon-btn" aria-label="Editar" title="Editar">
        <IconEdit size={15} />
      </Link>
      <button
        className="icon-btn icon-btn-danger"
        onClick={handleDelete}
        disabled={loading}
        aria-label="Borrar"
        title="Borrar"
      >
        <IconTrash size={15} />
      </button>
    </div>
  );
}
