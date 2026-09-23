"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SECCIONES_FIJAS_CLIENTES, ordenarSeccionesClientes } from "@/lib/nav-clientes";
import { IconLogout, IconGear, IconEdit, IconShuffle, IconLock, IconHistory } from "./icons";

// Topbar de App Equipos Clientes (23-sep-2026, primera versión real --
// hasta ahora esta app era un placeholder "próximamente" con
// HeaderSimple). Mismo look navy que App Interno (components/TopbarClient.js).
// Drag & drop del menú agregado el mismo día (pedido explícito: "haz
// que el menu tenga opcion para poder drag esos botones, para quienes
// quieran reorganizar, los unicos intocables son: inicio y mas") --
// mismo patrón que TopbarClient.js, pero con columna aparte
// (profiles.orden_menu_clientes) para no pisar el orden guardado por
// App Interno.
export default function TopbarClientes({ nombre, nombreCompleto, correo, esTitular, permisos, ordenMenuClientes }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const [links, setLinks] = useState(() => ordenarSeccionesClientes(ordenMenuClientes));
  const dragHref = useRef(null);
  const [sobreHref, setSobreHref] = useState(null);

  useEffect(() => {
    setLinks(ordenarSeccionesClientes(ordenMenuClientes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardarOrden(nuevosLinks) {
    const orden = nuevosLinks.filter((l) => !SECCIONES_FIJAS_CLIENTES.includes(l.href)).map((l) => l.href);
    await supabase
      .from("profiles")
      .update({ orden_menu_clientes: orden })
      .eq("id", (await supabase.auth.getUser()).data.user.id);
  }

  function onDragStart(e, href) {
    if (SECCIONES_FIJAS_CLIENTES.includes(href)) return;
    dragHref.current = href;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e, href) {
    if (SECCIONES_FIJAS_CLIENTES.includes(href) || !dragHref.current || dragHref.current === href) return;
    e.preventDefault();
    setSobreHref(href);
  }

  function onDrop(e, href) {
    e.preventDefault();
    setSobreHref(null);
    const origen = dragHref.current;
    dragHref.current = null;
    if (!origen || SECCIONES_FIJAS_CLIENTES.includes(href) || origen === href) return;

    setLinks((prev) => {
      const lista = [...prev];
      const iOrigen = lista.findIndex((l) => l.href === origen);
      const iDestino = lista.findIndex((l) => l.href === href);
      if (iOrigen === -1 || iDestino === -1) return prev;
      const [item] = lista.splice(iOrigen, 1);
      lista.splice(iDestino, 0, item);
      guardarOrden(lista);
      return lista;
    });
  }

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
  // Changelog en el menú de ajustes (pedido explícito, 23-sep-2026:
  // "ponme acceso del changelog también, para que lo vea quien yo
  // decida") -- mismo permiso "changelog" que ya usa App Interno, no
  // uno nuevo.
  const verChangelog = esTitular || permisos?.changelog;

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
              {verChangelog && (
                <Link href="/changelog" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconHistory size={15} /> Changelog
                </Link>
              )}
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
        {links.map((l) => {
          const fijo = SECCIONES_FIJAS_CLIENTES.includes(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              draggable={!fijo}
              onDragStart={(e) => onDragStart(e, l.href)}
              onDragOver={(e) => onDragOver(e, l.href)}
              onDrop={(e) => onDrop(e, l.href)}
              onDragEnd={() => {
                dragHref.current = null;
                setSobreHref(null);
              }}
              className={
                "topnav-link" +
                (pathname === l.href ? " topnav-link-active" : "") +
                (!fijo ? " topnav-link-drag" : "") +
                (sobreHref === l.href ? " topnav-link-over" : "")
              }
              title={!fijo ? "Arrastra para reordenar" : undefined}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
