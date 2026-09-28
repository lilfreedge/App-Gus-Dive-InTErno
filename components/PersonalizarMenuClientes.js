"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ATAJOS_MENU_CLIENTES, ATAJOS_INICIO_CLIENTES } from "@/lib/nav-clientes";

// Accesos directos opcionales de App Equipos de clientes (23-sep-2026,
// pedido explícito: "agrega boton opcional (asi como esta en app
// interno) para que la gente puedan ver shortcut de reportes en su
// menú, en caso de que asi lo quieran") -- mismo patrón que
// components/PersonalizarMenu.js de App Interno, pero escribiendo en
// profiles.menu_personalizado_clientes (columna aparte) para no pisar
// la de allá.
//
// La sección de "Accesos directos en Inicio" (item 4, 27-sep-2026) se
// había quitado de aquí (feedback sobre v40, pedido explícito: "quita el
// toggle de Registro de Órdenes de Personalizar mi menú, pon un botón
// fijo de Registrar orden en Inicio") -- su único atajo pasó a ser un
// botón fijo en el Hub de Inicio, ya no opcional.
//
// Reintroducida (28-sep-2026, pedido explícito: "pon en personalizar mi
// menu, el acceso a que puedan poner el boton de registro orden en
// inicio") -- ahora "+ Registrar orden" en Inicio vuelve a depender de
// este toggle además del permiso equipos_clientes_registrar (ver
// app/app-clientes/page.js). Decisión de Claude sin pedirse explícito:
// arranca ACTIVADO para todo el mundo (no hay valor guardado todavía en
// profiles.atajos_inicio_clientes para nadie) para no hacer desaparecer
// el botón de golpe de Inicio -- se puede reconsiderar si se prefería
// que arrancara apagado, como hacía este mismo mecanismo antes de v40.
export default function PersonalizarMenuClientes({ menuInicial, atajosInicioInicial }) {
  const router = useRouter();
  const supabase = createClient();

  const [menu, setMenu] = useState(menuInicial || {});
  const [atajosInicio, setAtajosInicio] = useState(atajosInicioInicial || {});
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function toggleOpcion(clave, valor) {
    const menuNuevo = { ...menu, [clave]: valor };
    setMenu(menuNuevo);
    await guardar({ menu_personalizado_clientes: menuNuevo });
  }

  async function toggleAtajoInicio(clave, valor) {
    const atajosNuevo = { ...atajosInicio, [clave]: valor };
    setAtajosInicio(atajosNuevo);
    await guardar({ atajos_inicio_clientes: atajosNuevo });
  }

  async function guardar(cambios) {
    setLoading(true);
    setMensaje(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("profiles").update(cambios).eq("id", user.id);

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

      <p className="hint-text" style={{ marginTop: 20, marginBottom: 14 }}>
        Actívalos para que aparezcan como botón de acceso directo dentro de Inicio.
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ATAJOS_INICIO_CLIENTES.map((op, i) => (
          <div key={op.id} className="switch-row" style={i === 0 ? { marginTop: 0 } : undefined}>
            <span className="switch-label">{op.label}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={atajosInicio[op.id] !== false}
                disabled={loading}
                onChange={(e) => toggleAtajoInicio(op.id, e.target.checked)}
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
