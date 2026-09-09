"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const OPCIONES = [
  { valor: "grande", etiqueta: "Logo grande", archivo: "/logo-gus-dive-center.png" },
  { valor: "chico", etiqueta: "Logo chico", archivo: "/logo-gus-icon.png" },
];

export default function LogoLoginSelector({ logoActual }) {
  const router = useRouter();
  const supabase = createClient();
  const [valor, setValor] = useState(logoActual);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function elegir(nuevoValor) {
    if (nuevoValor === valor || loading) return;
    setLoading(true);
    setMensaje("");

    const { error } = await supabase
      .from("app_config")
      .update({ logo_login: nuevoValor })
      .eq("id", true);

    setLoading(false);

    if (error) {
      setMensaje("No se pudo guardar el cambio.");
      return;
    }

    setValor(nuevoValor);
    setMensaje("Guardado.");
    router.refresh();
  }

  return (
    <div>
      <div className="section-title">Logo de la pantalla de Login</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {OPCIONES.map((op) => (
          <button
            key={op.valor}
            type="button"
            disabled={loading}
            onClick={() => elegir(op.valor)}
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              borderRadius: 9,
              border: `2px solid ${valor === op.valor ? "var(--azul-claro)" : "var(--borde)"}`,
              background: valor === op.valor ? "var(--superficie-suave)" : "var(--tarjeta)",
              color: valor === op.valor ? "var(--azul-claro)" : "var(--azul)",
              fontWeight: 600,
              fontSize: 14,
              cursor: loading ? "default" : "pointer",
            }}
          >
            <img src={op.archivo} alt={op.etiqueta} style={{ height: 32, objectFit: "contain" }} />
            {op.etiqueta}
            {valor === op.valor && " ✓"}
          </button>
        ))}
      </div>
      {mensaje && <div style={{ marginTop: 8, fontSize: 13 }}>{mensaje}</div>}
    </div>
  );
}
