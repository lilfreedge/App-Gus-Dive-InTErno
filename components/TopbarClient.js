"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { seccionesVisibles } from "@/lib/nav";
import { IconLogout, IconGear, IconEdit, IconHistory, IconUsers, IconBook } from "./icons";

export default function TopbarClient({
  nombre,
  nombreCompleto,
  correo,
  isAdmin,
  esTitular,
  permisos,
}) {
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

  const links = seccionesVisibles({ esTitular, permisos });
  const rolLabel = esTitular ? "Titular" : isAdmin ? "Administrador" : "Usuario";
  const verChangelog = esTitular || permisos?.changelog;
  const verManual = esTitular || permisos?.manual;

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
          <button
            className="gear-btn"
            onClick={() => setOpen((o) => !o)}
            aria-label="Ajustes"
          >
            <IconGear size={18} />
          </button>
          {open && (
            <div className="settings-menu">
              <div className="settings-menu-who">
                <b>{nombreCompleto}</b>
                {correo} · {rolLabel}
              </div>
              <Link href="/perfil" className="settings-menu-link" onClick={() => setOpen(false)}>
                <IconEdit size={15} /> Mi Perfil
              </Link>
              {verChangelog && (
                <Link
                  href="/changelog"
                  className="settings-menu-link"
                  onClick={() => setOpen(false)}
                >
                  <IconHistory size={15} /> Changelog
                </Link>
              )}
              {verManual && (
                <Link
                  href="/manual"
                  className="settings-menu-link"
                  onClick={() => setOpen(false)}
                >
                  <IconBook size={15} /> Manual
                </Link>
              )}
              {esTitular && (
                <Link
                  href="/admin/usuarios"
                  className="settings-menu-link"
                  onClick={() => setOpen(false)}
                >
                  <IconUsers size={15} /> Administración
                  <span className="settings-menu-tag">TITULAR</span>
                </Link>
              )}
              <hr />
              <button className="settings-menu-link settings-menu-danger" onClick={salir}>
                <IconLogout size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      <nav className="topnav">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={
              "topnav-link" + (pathname === l.href ? " topnav-link-active" : "")
            }
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
