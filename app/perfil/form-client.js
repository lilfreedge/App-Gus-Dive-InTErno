"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarCambio } from "@/lib/audit-client";

export default function PerfilForm({ userId, nombreActual }) {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState(nombreActual);
  const [msgNombre, setMsgNombre] = useState("");
  const [errorNombre, setErrorNombre] = useState("");
  const [loadingNombre, setLoadingNombre] = useState(false);

  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errorPass, setErrorPass] = useState("");
  const [okPass, setOkPass] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);

  async function guardarNombre(e) {
    e.preventDefault();
    setErrorNombre("");
    setMsgNombre("");

    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorNombre("El nombre no puede quedar vacío.");
      return;
    }
    if (nombreLimpio === nombreActual) return;

    setLoadingNombre(true);

    // Queda anotado en el Historial: quién, de qué nombre a cuál, y cuándo.
    await registrarCambio(supabase, {
      tabla: "profiles",
      registroId: userId,
      accion: "editar",
      datosAnteriores: { full_name: nombreActual },
    });

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: nombreLimpio })
      .eq("id", userId);

    setLoadingNombre(false);

    if (error) {
      setErrorNombre("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    setMsgNombre("✓ Nombre actualizado. Esto ya quedó anotado en el Historial.");
    router.refresh();
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    setErrorPass("");
    setOkPass("");

    if (!actual || !nueva || !confirmar) {
      setErrorPass("Completa los tres campos.");
      return;
    }
    if (nueva.length < 8) {
      setErrorPass("La contraseña nueva debe tener al menos 8 caracteres.");
      return;
    }
    if (nueva !== confirmar) {
      setErrorPass("La confirmación no coincide con la contraseña nueva.");
      return;
    }

    setLoadingPass(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Verifica la contraseña actual reautenticando antes de cambiarla.
    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: actual,
    });

    if (errorAuth) {
      setLoadingPass(false);
      setErrorPass("La contraseña actual no es correcta.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: nueva });

    setLoadingPass(false);

    if (error) {
      setErrorPass("No se pudo cambiar la contraseña. Intenta de nuevo.");
      return;
    }

    setActual("");
    setNueva("");
    setConfirmar("");
    setOkPass("✓ Contraseña actualizada.");
  }

  return (
    <>
      <form onSubmit={guardarNombre} className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          Mi información
        </div>
        <label htmlFor="nombre">Nombre</label>
        <input id="nombre" type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <p style={{ fontSize: 11.5, color: "var(--texto-suave)", marginTop: 4 }}>
          Si cambias tu nombre, queda registrado en el Historial (quién, de qué nombre a
          cuál, y cuándo) — y tus salidas/llenados pasados conservan el nombre tal como
          era en su momento, no se actualizan solos.
        </p>

        {errorNombre && <div className="error-box">{errorNombre}</div>}
        {msgNombre && <div className="success-box">{msgNombre}</div>}

        <button
          className="btn btn-secondary"
          type="submit"
          disabled={loadingNombre}
          style={{ marginTop: 10, width: "auto", padding: "10px 18px" }}
        >
          {loadingNombre ? "Guardando..." : "Guardar nombre"}
        </button>
      </form>

      <form onSubmit={cambiarPassword} className="card">
        <div className="section-title" style={{ marginTop: 0 }}>
          Cambiar contraseña
        </div>

        <label htmlFor="actual">
          Contraseña actual <span style={{ color: "var(--rojo)" }}>*</span>
        </label>
        <input
          id="actual"
          type="password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />

        <label htmlFor="nueva">
          Contraseña nueva <span style={{ color: "var(--rojo)" }}>*</span>
        </label>
        <input
          id="nueva"
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />

        <label htmlFor="confirmar">
          Confirmar contraseña nueva <span style={{ color: "var(--rojo)" }}>*</span>
        </label>
        <input
          id="confirmar"
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repite la contraseña nueva"
          autoComplete="new-password"
        />

        {errorPass && <div className="error-box">{errorPass}</div>}
        {okPass && <div className="success-box">{okPass}</div>}

        <button className="btn btn-primary" type="submit" disabled={loadingPass}>
          {loadingPass ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </>
  );
}
