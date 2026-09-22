"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Accesos directos que el usuario puede activar/desactivar para que
// aparezcan en el menú de arriba (top nav), además de las secciones fijas
// de lib/nav.js (NAV_SECTIONS). Ver lib/nav.js -> ATAJOS_MENU. "Equipos"
// se quitó de aquí porque ya es una sección fija siempre visible.
const OPCIONES_BASE = [
  { clave: "llenados", etiqueta: "Llenados" },
  { clave: "inspeccion_visual", etiqueta: "Inspección visual" },
  { clave: "mantenimiento_reguladores", etiqueta: "Mantenimiento de reguladores" },
];

// puedeCompresores: solo se ofrece este atajo a quien ya tenga el permiso
// "compresores" (Administración > Usuarios y permisos > General) -- si se
// lo quitan después, lib/nav.js -> seccionesVisibles lo revalida solo y
// el atajo deja de aparecer en el menú aunque siga "activado" aquí.
export default function PersonalizarMenu({ menuInicial, puedeCompresores }) {
  const router = useRouter();
  const supabase = createClient();

  const opciones = puedeCompresores
    ? [...OPCIONES_BASE, { clave: "compresores", etiqueta: "Compresores" }]
    : OPCIONES_BASE;

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
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 14 }}>
        Actívalos para que aparezcan como acceso directo en el menú de arriba.
        Se muestran con un borde punteado para diferenciarlos de las
        secciones fijas del menú.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {opciones.map((op, i) => (
          <div key={op.clave} className="switch-row" style={i === 0 ? { marginTop: 0 } : undefined}>
            <span className="switch-label">{op.etiqueta}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!menu[op.clave]}
                disabled={loading}
                onChange={(e) => toggleOpcion(op.clave, e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
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
