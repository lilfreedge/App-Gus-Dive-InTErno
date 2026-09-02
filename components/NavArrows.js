"use client";

// Reemplaza el viejo link "‹ volver": dos flechas grandes que avanzan/
// retroceden entre las secciones que el usuario actual puede ver
// (Inicio → Salidas → Tanques → Reportes → Catálogo → Historial).
import { useRouter, usePathname } from "next/navigation";
import { seccionesVisibles } from "@/lib/nav";
import { IconArrowLeft, IconArrowRight } from "./icons";

export default function NavArrows({ esTitular, permisos }) {
  const router = useRouter();
  const pathname = usePathname();

  const secciones = seccionesVisibles({ esTitular, permisos });
  const idx = secciones.findIndex((s) => pathname.startsWith(s.href));

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
