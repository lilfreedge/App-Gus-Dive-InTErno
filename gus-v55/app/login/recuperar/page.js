"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?type=recovery&next=/login/actualizar-password`,
    });

    setLoading(false);

    if (error) {
      setError("No se pudo enviar el correo. Intenta de nuevo.");
      return;
    }

    setSuccess(true);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <Image
            src="/logo-gus-dive-center.png"
            alt="Gus Dive Center"
            width={220}
            height={57}
            priority
          />
        </div>
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">Te mandamos un enlace a tu correo para restablecerla.</p>

        {success ? (
          <div className="success-box">
            ✓ Listo. Revisa tu correo para el enlace de restablecer contraseña.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
            />

            {error && <div className="error-box">{error}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <Link href="/login">← Volver a iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
