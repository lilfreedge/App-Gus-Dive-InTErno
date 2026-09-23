"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ATAJOS_MENU_CLIENTES } from "@/lib/nav-clientes";

// Accesos directos opcionales de App Equipos de clientes (23-sep-2026,
// pedido explícito: "agrega boton opcional (asi como esta en app
// interno) para que la gente puedan ver shortcut de reportes en su
// menú, en caso de que asi lo quieran") -- mismo patrón que
// components/PersonalizarMenu.js de App Interno, pero escribiendo en
// profiles.menu_personalizado_clientes (columna aparte) para no pisar
// la de allá.
export default function PersonalizarMenuClientes({ menuInicial }) {
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
      .update({ menu_personalizado_clientes: menuNuevo })
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
        Actívalos para que aparezcan como acceso directo en el menú de arriba, junto a Registro de Órdenes y Listado de clientes -- también se pueden arrastrar para reordenar.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ATAJOS_MENU_CLIENTES.map((op, i) => (
          <div key={op.id} className="switch-row" style={i === 0 ? { marginTop: 0 } : undefined}>
            <span className="switch-label">{op.label}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={!!menu[op.id]}
                disabled={loading}
                onChange={(e) => toggleOpcion(op.id, e.target.checked)}
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
