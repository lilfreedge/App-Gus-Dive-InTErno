"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState({
    src: "/logo-gus-dive-center.png",
    width: 220,
    height: 57,
  });

  // Si venimos de un enlace de confirmación/recuperación que no se pudo
  // validar (ver app/auth/confirm/route.js), mostramos aquí el motivo en
  // vez de dejarlo caer en una ruta que no existe.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) setError(err);
  }, []);

  // Qué logo mostrar (config del Titular en app_config). Lectura pública,
  // funciona sin sesión. Si algo falla o no hay config, se queda con el
  // logo grande por defecto, sin mostrar error al usuario.
  useEffect(() => {
    let cancelado = false;

    supabase
      .from("app_config")
      .select("logo_login")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado || error || !data) return;
        if (data.logo_login === "chico") {
          setLogo({ src: "/logo-gus-icon.png", width: 64, height: 64 });
        }
      })
      .catch(() => {});

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/espacio");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <Image
            key={logo.src}
            src={logo.src}
            alt="Gus Dive Center"
            width={logo.width}
            height={logo.height}
            priority
          />
        </div>
        <p className="auth-subtitle">Control interno de la tienda</p>

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

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />

          {error && <div className="error-box">{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="auth-switch">
          <Link href="/login/recuperar">¿Olvidé mi contraseña?</Link>
        </div>

        <div className="auth-switch">
          ¿Usuario nuevo? <Link href="/registro">Crear cuenta</Link>
        </div>
      </div>
    </div>
  );
}
