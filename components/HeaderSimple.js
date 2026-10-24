"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { IconGear, IconLogout, IconLock, IconCheck } from "./icons";

// Header liviano para pantallas fuera de "un espacio" (selector de espacio,
// placeholder de App Clientes) -- mismo look navy que el topbar normal
// (components/TopbarClient.js), con el logo de siempre, pero sin el nav de
// pestañas. Al principio solo tenía "Cerrar sesión" (ítem 7 del feedback
// de v14, 22-sep-2026); se le agregó "Accesos a apps" (26-sep-2026,
// pedido explícito: mover aquí el control de quién entra a cada app,
// antes repartido dentro de la Administración de cada una) -- solo la
// ve el Titular. "Usuarios nuevos" se sumó el 1-oct-2026 (item 10, pedido
// explícito: "esto puede estar al principio en donde estan los apps...
// que obviamente solo me salga a mi") -- mismo criterio, con un conteo en
// rojo de cuántas cuentas están esperando aprobación (pendientesAprobacion,
// calculado en app/espacio/page.js) para que el Titular no tenga que
// entrar a revisar si no hay nada nuevo.
//
// V33: `sinBarra` -- "¿A dónde quieres entrar?" va sin barra de color (opción
// C de la maqueta, pedido explícito: "el azul no es el color principal del
// app, me gustaría cambiar el azul de arriba"). Las demás pantallas que usan
// este header no cambian.
// V38: `enlaces` ([{ href, texto }]) -- links extra en el menú de ajustes
// (el menú del técnico pone "Mi perfil" y "Entrar al app completo").
// V40: `inicio` -- a dónde lleva el logo (por defecto, "¿A dónde quieres
// entrar?"; el técnico ahí mismo vuelve a su menú).
export default function HeaderSimple({ nombre, etiqueta, esTitular, pendientesAprobacion = 0, sinBarra = false, enlaces = [], inicio = "/espacio" }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function salir() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={sinBarra ? "header-sin-barra" : "topbar"} style={sinBarra ? undefined : { paddingBottom: 14 }}>
      <div className="topbar-inner">
        <div>
          {/* V40: el logo lleva al inicio de donde estés (pedido explícito:
              "el logo de Gus arriba a la izquierda, cuando uno le da click,
              te lleva al inicio"). */}
          <Link href={inicio} className="topbar-logo-link" aria-label="Ir al inicio">
            <Image
              src="/logo-gus-icon.png"
              alt="Gus Dive"
              width={64}
              height={22}
              className="topbar-logo"
              priority
            />
          </Link>
          {nombre && <div className="topbar-sub">Hola, {nombre}</div>}
        </div>

        <div className="gear-wrap" ref={menuRef}>
          <button
            className="gear-btn"
            onClick={() => setOpen((o) => !o)}
            aria-label="Ajustes"
          >
            <IconGear size={18} />
          </button>
          {open && (
            <div className="settings-menu">
              {esTitular && (
                <Link href="/espacio/accesos" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconLock size={15} /> Accesos a apps
                </Link>
              )}
              {esTitular && (
                <Link href="/espacio/aprobaciones" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconCheck size={15} /> Usuarios nuevos
                  {pendientesAprobacion > 0 && <span className="badge badge-rojo">{pendientesAprobacion}</span>}
                </Link>
              )}
              {enlaces.map((e) => (
                <Link key={e.href} href={e.href} className="settings-menu-link" onClick={() => setOpen(false)}>
                  {e.texto}
                </Link>
              ))}
              <button
                className="settings-menu-link settings-menu-danger"
                onClick={salir}
              >
                <IconLogout size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      {etiqueta && !sinBarra && <div className="topbar-appname">{etiqueta}</div>}
    </div>
  );
}
