"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Accesos directos que el usuario puede activar/desactivar para que
// aparezcan en el menú de arriba (top nav), además de las secciones fijas
// de lib/nav.js (NAV_SECTIONS). Ver lib/nav.js -> ATAJOS_MENU.
const OPCIONES = [
  { clave: "llenados", etiqueta: "Llenados" },
  { clave: "inspeccion_visual", etiqueta: "Inspección visual" },
  { clave: "tanques_hub", etiqueta: "Equipos" },
  { clave: "mantenimiento_reguladores", etiqueta: "Mantenimiento de reguladores" },
];

export default function PersonalizarMenu({ menuInicial }) {
  const router = useRouter();
  const supabase = createClient();

  const [menu, setMenu] = useState(menuInicial || {});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function toggleOpcion(clave, valor) {
    const menuNuevo = { ...menu, [clave]: valor };
    setMenu(menuNuevo);
    setLoading(true);
    setMensaje(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({ menu_personalizado: menuNuevo })
      .eq("id", user.id);

    setLoading(false);

    if (error) {
      setMensaje({ tipo: "error", texto: "No se pudo guardar el cambio." });
      return;
    }

    setMensaje({ tipo: "ok", texto: "Guardado." });
    router.refresh();
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
        Actívalos para que aparezcan como acceso directo en el menú de arriba.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {OPCIONES.map((op) => (
          <label key={op.clave} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={!!menu[op.clave]}
              disabled={loading}
              onChange={(e) => toggleOpcion(op.clave, e.target.checked)}
            />
            {op.etiqueta}
          </label>
        ))}
      </div>

      {mensaje && (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: mensaje.tipo === "error" ? "var(--rojo)" : "var(--azul)",
          }}
        >
          {mensaje.texto}
        </div>
      )}
    </div>
  );
}
