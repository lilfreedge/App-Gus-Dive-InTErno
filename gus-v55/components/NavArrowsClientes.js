"use client";

// Flechas de navegación de App Clientes (23-sep-2026, pedido explícito
// -- reemplaza el "← Volver" en las pantallas principales: Inicio,
// Registro de Órdenes, Listado de clientes, Más -- "Listado de órdenes"
// se sacó de esta lista el mismo día al mudarse dentro de "Más"). Mismo
// patrón que components/NavArrows.js de App Interno, pero recorriendo
// el orden FIJO de las secciones de App Clientes (lib/nav-clientes.js)
// -- igual que en App Interno, las flechas usan el orden fijo de las
// secciones, no el orden personalizado con drag & drop (item 4).
import { useRouter, usePathname } from "next/navigation";
import { NAV_SECTIONS_CLIENTES, puedeVerSeccionClientes } from "@/lib/nav-clientes";
import { IconArrowLeft, IconArrowRight } from "./icons";

export default function NavArrowsClientes({ esTitular, permisos }) {
  const router = useRouter();
  const pathname = usePathname();

  const secciones = NAV_SECTIONS_CLIENTES.filter((s) => puedeVerSeccionClientes(s, { esTitular, permisos }));
  const idx = secciones.findIndex((s) =>
    s.href === "/app-clientes" ? pathname === "/app-clientes" : pathname.startsWith(s.href)
  );

  const prev = idx > 0 ? secciones[idx - 1] : null;
  const next = idx >= 0 && idx < secciones.length - 1 ? secciones[idx + 1] : null;

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
