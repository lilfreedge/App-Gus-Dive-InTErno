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

// Secciones que puede ver este usuario, en orden, para el top nav y las
// flechas grandes de navegación entre pantallas.
export function seccionesVisibles({ esTitular, permisos }) {
  return NAV_SECTIONS.filter(
    (s) => s.key === null || esTitular || permisos?.[s.key]
  );
}
