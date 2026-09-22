"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { seccionesVisibles, ordenarSecciones, NAV_SECTIONS, SECCIONES_FIJAS } from "@/lib/nav";
import { IconLogout, IconGear, IconEdit, IconHistory, IconUsers, IconBook } from "./icons";

export default function TopbarClient({
  nombre,
  nombreCompleto,
  correo,
  isAdmin,
  esTitular,
  permisos,
  menuPersonalizado,
  ordenMenu,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Orden del menú superior, reorganizable con drag & drop. "Inicio"
  // queda siempre fijo de primero (ordenarSecciones lo excluye del
  // reordenamiento); el resto arranca con el orden guardado por este
  // usuario en profiles.orden_menu, o el orden normal si nunca lo
  // cambió.
  const linksBase = useMemo(
    () => seccionesVisibles({ esTitular, permisos, menuPersonalizado }),
    [esTitular, permisos, menuPersonalizado]
  );
  const [links, setLinks] = useState(() => ordenarSecciones(linksBase, ordenMenu));
  const dragHref = useRef(null);
  const [sobreHref, setSobreHref] = useState(null);

  useEffect(() => {
    setLinks(ordenarSecciones(linksBase, ordenMenu));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linksBase]);

  async function guardarOrden(nuevosLinks) {
    const orden = nuevosLinks.filter((l) => !SECCIONES_FIJAS.includes(l.href)).map((l) => l.href);
    await supabase.from("profiles").update({ orden_menu: orden }).eq("id", (await supabase.auth.getUser()).data.user.id);
  }

  function onDragStart(e, href) {
    if (SECCIONES_FIJAS.includes(href)) return;
    dragHref.current = href;
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragOver(e, href) {
    if (SECCIONES_FIJAS.includes(href) || !dragHref.current || dragHref.current === href) return;
    e.preventDefault();
    setSobreHref(href);
  }

  function onDrop(e, href) {
    e.preventDefault();
    setSobreHref(null);
    const origen = dragHref.current;
    dragHref.current = null;
    if (!origen || SECCIONES_FIJAS.includes(href) || origen === href) return;

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
        {links.map((l) => {
          const fijo = SECCIONES_FIJAS.includes(l.href);
          const esAtajo = !NAV_SECTIONS.some((s) => s.href === l.href);
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
                (esAtajo ? " topnav-link-atajo" : "") +
                (sobreHref === l.href ? " topnav-link-over" : "")
              }
              title={
                esAtajo
                  ? "Acceso directo que activaste en Mi Perfil"
                  : !fijo
                  ? "Arrastra para reordenar"
                  : undefined
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
