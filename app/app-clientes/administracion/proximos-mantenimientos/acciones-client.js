"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// V31 — "Notificar vía WhatsApp" abre el chat del cliente SIN mensaje
// (decisión del 12-oct: "dejémoslo sin mensaje por ahora, que cuando uno
// le dé al botón te abra el chat y ya para que nosotros escribamos") y
// anota el aviso en avisos_clientes (migration_60.sql).
export function BotonWhatsApp({ clienteId, telefono, motivo }) {
  const router = useRouter();
  const supabase = createClient();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function notificar() {
    setError("");
    // Se abre primero, dentro del mismo click, para que el navegador no lo
    // bloquee como ventana emergente.
    window.open(`https://wa.me/${telefono}`, "_blank", "noopener,noreferrer");
    setGuardando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: perfil } = user
      ? await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      : { data: null };
    const { error: err } = await supabase.from("avisos_clientes").insert({
      cliente_id: clienteId,
      motivo,
      user_id: user?.id || null,
      nombre_usuario_snapshot: perfil?.full_name || null,
    });
    setGuardando(false);
    if (err) {
      setError("Se abrió WhatsApp, pero no se pudo anotar el aviso. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={notificar}
        disabled={guardando}
        className="btn secondary"
        style={{ marginTop: 0, width: "auto", padding: "7px 12px", fontSize: 12.5 }}
      >
        {guardando ? "Anotando..." : "Notificar vía WhatsApp"}
      </button>
      {error && (
        <div className="error-box" style={{ width: "100%", marginTop: 6 }}>
          {error}
        </div>
      )}
    </>
  );
}

// "Deshacer" de un aviso (por si se tocó sin querer): lo borra.
export function DeshacerAviso({ avisoId }) {
  const router = useRouter();
  const supabase = createClient();
  const [cargando, setCargando] = useState(false);

  async function deshacer() {
    setCargando(true);
    await supabase.from("avisos_clientes").delete().eq("id", avisoId);
    setCargando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={deshacer}
      disabled={cargando}
      style={{
        border: "none",
        background: "none",
        padding: 0,
        color: "var(--rojo)",
        fontWeight: 700,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {cargando ? "..." : "Deshacer"}
    </button>
  );
}
