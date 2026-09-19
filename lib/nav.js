// Orden y definición de las secciones de navegación de la app.
// `key` es la clave en profiles.permisos que decide si esa sección se ve
// (null = siempre visible para cualquier usuario logueado).
export const NAV_SECTIONS = [
  { href: "/dashboard", label: "Inicio", key: null },
  { href: "/salidas", label: "Salidas", key: null },
  { href: "/equipos", label: "Equipos", key: null },
  { href: "/movimientos", label: "Movimientos", key: "movimientos" },
  { href: "/reportes", label: "Reportes", key: "reportes" },
  { href: "/catalogo", label: "Catálogo", key: "catalogo" },
  { href: "/admin/historial", label: "Historial", key: "historial" },
];

// Accesos directos configurables por cada usuario (profiles.menu_personalizado)
// que se agregan al final del top nav cuando están activados. `id` es la
// clave dentro de menu_personalizado.
export const ATAJOS_MENU = [
  { id: "llenados", href: "/tanques", label: "Llenados" },
  { id: "inspeccion_visual", href: "/equipos/inspeccion-visual", label: "Inspección visual" },
  { id: "tanques_hub", href: "/equipos", label: "Equipos" },
  { id: "mantenimiento_reguladores", href: "/equipos/mantenimiento-reguladores", label: "Mantenimiento" },
];

// Secciones que puede ver este usuario, en orden, para el top nav y las
// flechas grandes de navegación entre pantallas. Incluye, al final, los
// atajos que el usuario activó en Mi Perfil (menuPersonalizado), evitando
// repetir un href que ya esté en las secciones fijas.
export function seccionesVisibles({ esTitular, permisos, menuPersonalizado }) {
  const base = NAV_SECTIONS.filter(
    (s) => s.key === null || esTitular || permisos?.[s.key]
  );
  const baseHrefs = new Set(base.map((s) => s.href));
  const atajos = (menuPersonalizado
    ? ATAJOS_MENU.filter((a) => menuPersonalizado[a.id])
    : []
  ).filter((a) => !baseHrefs.has(a.href));
  return [...base, ...atajos];
}
