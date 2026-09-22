"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegistroPage() {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/confirm?type=signup&next=/espacio`,
      },
    });

    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setError("Ya existe una cuenta con ese correo.");
      } else if (error.message.toLowerCase().includes("password")) {
        setError("La contraseña debe tener al menos 6 caracteres.");
      } else {
        setError("No se pudo crear la cuenta. Intenta de nuevo.");
      }
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
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">Uso interno del equipo</p>

        {success ? (
          <>
            <div className="success-box">
              Cuenta creada. Confirma tu cuenta en el correo que te llegó y luego inicia sesión.
            </div>
            <Link href="/login">
              <button className="btn btn-primary" type="button">
                Ir a iniciar sesión
              </button>
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="fullName">Nombre completo</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Juan Pérez"
            />

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

            <label htmlFor="password">Contraseña</label>
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
              {loading ? "Creando..." : "Crear cuenta"}
            </button>
          </form>
        )}

        {!success && (
          <div className="auth-switch">
            ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
          </div>
        )}
      </div>
    </div>
  );
}
