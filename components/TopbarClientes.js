"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLogout, IconGear, IconEdit, IconShuffle, IconLock } from "./icons";

// Topbar de App Equipos Clientes (23-sep-2026, primera versión real --
// hasta ahora esta app era un placeholder "próximamente" con
// HeaderSimple). Mismo look navy que App Interno (components/TopbarClient.js)
// pero con su propio nav fijo -- 4 pestañas pedidas por el usuario
// ("arriba en el menu principal poner estos botones: registro, listado
// de clientes" + "agrega historial ordenes") -- sin drag&drop ni accesos
// personalizados, que son cosas específicas de App Interno.
const LINKS = [
  { href: "/app-clientes", label: "Inicio" },
  { href: "/app-clientes/ordenes", label: "Registro" },
  { href: "/app-clientes/clientes", label: "Listado de clientes" },
  { href: "/app-clientes/historial", label: "Historial de órdenes" },
];

export default function TopbarClientes({ nombre, nombreCompleto, correo, esTitular }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const rolLabel = esTitular ? "Titular" : "Usuario";

  return (
    <div className="topbar">
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
          <button className="gear-btn" onClick={() => setOpen((o) => !o)} aria-label="Ajustes">
            <IconGear size={18} />
          </button>
          {open && (
            <div className="settings-menu">
              <div className="settings-menu-who">
                <b>{nombreCompleto}</b>
                {correo} · {rolLabel}
              </div>
              <Link href="/app-clientes/perfil" className="settings-menu-link" onClick={() => setOpen(false)}>
                <IconEdit size={15} /> Mi Perfil
              </Link>
              {esTitular && (
                <Link href="/app-clientes/administracion" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconLock size={15} /> Administración
                </Link>
              )}
              <hr />
              <Link href="/espacio" className="settings-menu-link" onClick={() => setOpen(false)}>
                <IconShuffle size={15} /> Cambiar de app
              </Link>
              <button className="settings-menu-link settings-menu-danger" onClick={salir}>
                <IconLogout size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="topbar-appname">App Clientes</div>
      <nav className="topnav">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={"topnav-link" + (pathname === l.href ? " topnav-link-active" : "")}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
