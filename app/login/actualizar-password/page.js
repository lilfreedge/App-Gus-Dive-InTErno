"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Se llega aquí desde el enlace de "recuperar contraseña" del correo, ya
// con una sesión de recuperación activa (creada por app/auth/confirm) —
// por eso no pide la contraseña actual, solo la nueva.
export default function ActualizarPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError("No se pudo actualizar. Intenta de nuevo.");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
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
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-subtitle">Escribe tu nueva contraseña para tu cuenta.</p>

        {success ? (
          <div className="success-box">✓ Contraseña actualizada. Entrando...</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="password">Nueva contraseña</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />

            {error && <div className="error-box">{error}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
