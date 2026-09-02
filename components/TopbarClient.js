"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLogout } from "./icons";

const LINKS_BASE = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/salidas", label: "Salidas" },
  { href: "/tanques", label: "Tanques" },
];

const LINKS_ADMIN = [
  { href: "/reportes", label: "Reportes" },
  { href: "/admin/articulos", label: "Catálogo" },
  { href: "/admin/usuarios", label: "Administradores" },
  { href: "/admin/historial", label: "Historial de cambios" },
];

export default function TopbarClient({ nombre, isAdmin }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  async function salir() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const links = isAdmin ? [...LINKS_BASE, ...LINKS_ADMIN] : LINKS_BASE;

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
        <button className="btn-link" onClick={salir} aria-label="Salir">
          <IconLogout size={20} />
        </button>
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
