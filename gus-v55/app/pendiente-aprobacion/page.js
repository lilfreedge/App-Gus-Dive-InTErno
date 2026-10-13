"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Pendiente de aprobación" (item 10, 1-oct-2026, pedido explícito) --
// a donde cae un usuario nuevo con sesión iniciada pero todavía sin
// aprobar (profiles.aprobado = false, migration_48.sql). El middleware
// (lib/supabase/middleware.js) manda para acá a cualquiera en ese
// estado, sin importar qué URL haya pedido -- esta pantalla es la única
// a la que SÍ puede entrar mientras espera. "Ya me aprobaron" vuelve a
// pedirle la sesión al servidor (router.refresh) para que el middleware
// decida de nuevo si ya puede pasar.
export default function PendienteAprobacionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [revisando, setRevisando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelado) return;
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (!cancelado) setNombre(data?.full_name?.split(" ")[0] || "");
    }
    cargar();
    return () => {
      cancelado = true;
    };
  }, [supabase]);

  async function revisar() {
    setRevisando(true);
    router.refresh();
    setTimeout(() => setRevisando(false), 600);
  }

  async function salir() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <Image src="/logo-gus-dive-center.png" alt="Gus Dive Center" width={220} height={57} priority />
        </div>
        <h1 className="auth-title">Cuenta pendiente de aprobación</h1>
        <p className="auth-subtitle">
          {nombre ? `Hola, ${nombre}. ` : ""}Tu cuenta ya fue creada, pero todavía necesita que el Titular la apruebe
          antes de que puedas entrar.
        </p>

        <button className="btn btn-primary" type="button" onClick={revisar} disabled={revisando}>
          {revisando ? "Revisando..." : "Ya me aprobaron, continuar"}
        </button>

        <div className="auth-switch">
          <button
            type="button"
            onClick={salir}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--azul-claro)", fontWeight: 600, fontSize: 13 }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
