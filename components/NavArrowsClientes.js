"use client";

// Flechas de navegación de App Clientes (23-sep-2026, pedido explícito
// -- reemplaza el "← Volver" en las 5 pantallas principales: Inicio,
// Registro, Listado de clientes, Listado de órdenes, Más). Mismo
// patrón que components/NavArrows.js de App Interno, pero recorriendo
// el orden FIJO de las 5 secciones de App Clientes (lib/nav-clientes.js)
// -- igual que en App Interno, las flechas usan el orden fijo de las
// secciones, no el orden personalizado con drag & drop (item 4).
import { useRouter, usePathname } from "next/navigation";
import { NAV_SECTIONS_CLIENTES } from "@/lib/nav-clientes";
import { IconArrowLeft, IconArrowRight } from "./icons";

export default function NavArrowsClientes() {
  const router = useRouter();
  const pathname = usePathname();

  const idx = NAV_SECTIONS_CLIENTES.findIndex((s) =>
    s.href === "/app-clientes" ? pathname === "/app-clientes" : pathname.startsWith(s.href)
  );

  const prev = idx > 0 ? NAV_SECTIONS_CLIENTES[idx - 1] : null;
  const next = idx >= 0 && idx < NAV_SECTIONS_CLIENTES.length - 1 ? NAV_SECTIONS_CLIENTES[idx + 1] : null;

  return (
    <div className="nav-arrows">
      {prev ? (
        <button
          className="nav-arrow-btn"
          onClick={() => router.push(prev.href)}
          aria-label={`Ir a ${prev.label}`}
          title={prev.label}
        >
          <IconArrowLeft size={26} />
        </button>
      ) : (
        <span className="nav-arrow-spacer" />
      )}
      {next ? (
        <button
          className="nav-arrow-btn"
          onClick={() => router.push(next.href)}
          aria-label={`Ir a ${next.label}`}
          title={next.label}
        >
          <IconArrowRight size={26} />
        </button>
      ) : (
        <span className="nav-arrow-spacer" />
      )}
    </div>
  );
}
