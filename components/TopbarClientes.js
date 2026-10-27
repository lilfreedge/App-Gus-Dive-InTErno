"use client";

import FechaHoy from "@/components/FechaHoy";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NAV_SECTIONS_CLIENTES, SECCIONES_FIJAS_CLIENTES, ordenarSeccionesClientes, puedeVerSeccionClientes } from "@/lib/nav-clientes";
import { useReorderDrag } from "@/lib/useReorderDrag";
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
export default function TopbarClientes({
  nombre,
  nombreCompleto,
  correo,
  esTitular,
  isAdmin = false,
  permisos,
  ordenMenuClientes,
  menuPersonalizadoClientes,
  inicio = "/app-clientes",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const [links, setLinks] = useState(() => ordenarSeccionesClientes(ordenMenuClientes, menuPersonalizadoClientes));

  useEffect(() => {
    setLinks(ordenarSeccionesClientes(ordenMenuClientes, menuPersonalizadoClientes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardarOrden(nuevosLinks) {
    const orden = nuevosLinks.filter((l) => !SECCIONES_FIJAS_CLIENTES.includes(l.href)).map((l) => l.href);
    await supabase
      .from("profiles")
      .update({ orden_menu_clientes: orden })
      .eq("id", (await supabase.auth.getUser()).data.user.id);
  }

  // Arrastre manual con Pointer Events (lib/useReorderDrag.js) -- ver el
  // comentario ahí para el porqué (bug reportado en vivo con el drag &
  // drop nativo de HTML5, que un simple click con trackpad disparaba).
  const { sobreHref, getItemProps, onNavClickCapture } = useReorderDrag({
    fijos: SECCIONES_FIJAS_CLIENTES,
    setLinks,
    guardarOrden,
  });

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
  // V34 -- el técnico (rol con Pantalla de inicio "Mis órdenes asignadas"):
  // en el menú solo lo que va a usar (pedido explícito: "Solo debe de tener
  // lo que vaya a usar. Quítale el botón de inicio... Lo que sí puedes
  // dejarle es el listado de órdenes"; maqueta-v34-2.html, opción A): "Mis
  // órdenes" (su pantalla) e "Historial de órdenes" (si tiene el permiso).
  // Sin arrastrar. Y "Cambiar de app" solo si también tiene App Interno.
  const tecnico = !esTitular && !isAdmin && !!permisos?.rol_tecnico;
  const linksTecnico = [
    { href: "/app-clientes", label: "Mis órdenes" },
    ...(permisos?.equipos_clientes_listado_ordenes ? [{ href: "/app-clientes/historial", label: "Historial de órdenes" }] : []),
  ];
  const verCambiarApp = !tecnico || !!permisos?.acceso_app_interno;
  // Changelog en el menú de ajustes (pedido explícito, 23-sep-2026:
  // "ponme acceso del changelog también, para que lo vea quien yo
  // decida") -- mismo permiso "changelog" que ya usa App Interno, no
  // uno nuevo.
  const verChangelog = esTitular || permisos?.changelog;

  return (
    <div className="topbar">
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
          <div className="topbar-sub">
            Hola, {nombre}
            <FechaHoy />
          </div>
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
                <Link
                  href="/changelog?desde=clientes"
                  className="settings-menu-link"
                  onClick={() => setOpen(false)}
                >
                  <IconHistory size={15} /> Changelog
                </Link>
              )}
              {esTitular && (
                <Link href="/app-clientes/administracion" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconLock size={15} /> Administración
                </Link>
              )}
              <hr />
              {verCambiarApp && (
                <Link href="/espacio?elegir=1" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconShuffle size={15} /> Cambiar de app
                </Link>
              )}
              <button className="settings-menu-link settings-menu-danger" onClick={salir}>
                <IconLogout size={15} /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="topbar-appname">App Equipos de clientes</div>
      {tecnico ? (
        <nav className="topnav">
          {linksTecnico.map((l) => (
            <Link key={l.href} href={l.href} className={"topnav-link" + (pathname === l.href ? " topnav-link-active" : "")}>
              {l.label}
            </Link>
          ))}
        </nav>
      ) : (
      <nav className="topnav" onClickCapture={onNavClickCapture}>
        {links
          .filter((l) => puedeVerSeccionClientes(l, { esTitular, permisos }))
          .map((l) => {
          const fijo = SECCIONES_FIJAS_CLIENTES.includes(l.href);
          // Accesos directos opcionales (26-sep-2026, pedido explícito:
          // "haz que estos shortcuts opcionales se vean diferentes a los
          // fijos, asi como en el app interno") -- mismo cálculo y misma
          // clase (.topnav-link-atajo) que ya usa components/TopbarClient.js.
          const esAtajo = !NAV_SECTIONS_CLIENTES.some((s) => s.href === l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              {...getItemProps(l.href)}
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
      )}
    </div>
  );
}
