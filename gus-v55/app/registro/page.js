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

    // Aprobación del Titular en vez de confirmación por correo (item 10,
    // 1-oct-2026, pedido explícito: "quiero que los usuarios nuevos sean
    // confirmados solo por mi, no que se confirmen ellos mismos por
    // correo") -- emailRedirectTo/type=signup se deja igual por si
    // "Confirm email" sigue encendido en el dashboard de Supabase
    // mientras se hace el cambio, pero la idea es apagarlo ahí (ver
    // migration_48.sql): con eso apagado, signUp ya deja al usuario con
    // sesión iniciada, y es profiles.aprobado (middleware.js) lo que
    // decide si puede entrar.
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
              Cuenta creada. Ahora el Titular tiene que aprobar tu acceso antes de que puedas entrar.
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
