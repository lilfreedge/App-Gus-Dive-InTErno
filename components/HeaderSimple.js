"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconGear, IconLogout } from "./icons";

// Header liviano para pantallas fuera de "un espacio" (selector de espacio,
// placeholder de App Clientes) -- mismo look navy que el topbar normal
// (components/TopbarClient.js), con el logo de siempre, pero sin el nav de
// pestañas ni el resto del menú de ajustes: acá solo hace falta poder
// cerrar sesión (ítem 7 del feedback de v14, 22-sep-2026), porque todavía
// no se ha elegido en qué espacio se está.
export default function HeaderSimple({ nombre, etiqueta }) {
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
    <div className="topbar" style={{ paddingBottom: 14 }}>
      <div className="topbar-inner">
        <div>
          <Image
            src="/logo-gus-icon.png"
            alt="Gus Dive"
            width={64}
            height={22}
            className="topbar-logo"
            priority
          />
          <div className="topbar-sub">Hola, {nombre}</div>
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
      {etiqueta && <div className="topbar-appname">{etiqueta}</div>}
    </div>
  );
}
