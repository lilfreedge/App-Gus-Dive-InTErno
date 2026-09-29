// Orden y definición de las secciones de navegación de la app.
// `key` es la clave en profiles.permisos que decide si esa sección se ve
// (null = siempre visible para cualquier usuario logueado; un arreglo de
// claves = visible si tiene al menos uno de esos permisos — usado por
// "Más", que junta Catálogo/Historial/Reportes en un solo botón).
export const NAV_SECTIONS = [
  { href: "/dashboard", label: "Inicio", key: null },
  { href: "/salidas", label: "Salidas", key: null },
  { href: "/equipos", label: "Equipos", key: null },
  { href: "/movimientos", label: "Movimientos", key: "movimientos" },
  { href: "/mas", label: "Más", key: ["catalogo", "historial", "reportes"] },
];

// Accesos directos que se agregan al final del top nav según los permisos
// de cada usuario (profiles.permisos) -- ya no es un toggle manual en Mi
// Perfil (pedido explícito, 29-sep-2026: "quitar la parte de personalizar
// mi menu en usuarios, a segun lo tengan habilitado en administracion o
// no"; antes vivía en profiles.menu_personalizado, ver PersonalizarMenu.js
// -- se dejó el componente y la columna sin usar, no se borraron). "Equipos"
// (tanques_hub) se quitó de aquí porque ya es una sección fija siempre
// visible (no tenía sentido como atajo). Cada atajo se revalida en cada
// carga contra `permiso` -- si a alguien le quitan/dan el permiso en
// Administración, el atajo desaparece/aparece solo, sin que el usuario
// tenga que tocar nada.
export const ATAJOS_MENU = [
  { id: "llenados", href: "/tanques", label: "Llenados", permiso: "llenados" },
  { id: "inspeccion_visual", href: "/equipos/inspeccion-visual", label: "Inspección visual", permiso: "inspeccion_visual" },
  { id: "mantenimiento_reguladores", href: "/equipos/mantenimiento-reguladores", label: "Mantenimiento", permiso: "mantenimiento_reguladores" },
  { id: "compresores", href: "/equipos/compresores", label: "Compresores", permiso: "compresores" },
];

// Secciones del menú superior que quedan fijas: no se pueden arrastrar ni
// reordenar. "Inicio" siempre de primero, "Más" siempre de último.
export const SECCIONES_FIJAS = ["/dashboard", "/mas"];

// Secciones que puede ver este usuario, en orden, para el top nav y las
// flechas grandes de navegación entre pantallas. Incluye, al final, los
// atajos de ATAJOS_MENU cuyo permiso ya tiene este usuario, evitando
// repetir un href que ya esté en las secciones fijas.
export function seccionesVisibles({ esTitular, permisos }) {
  const base = NAV_SECTIONS.filter((s) => {
    if (s.key === null) return true;
    if (esTitular) return true;
    if (Array.isArray(s.key)) return s.key.some((k) => permisos?.[k]);
    return !!permisos?.[s.key];
  });
  const baseHrefs = new Set(base.map((s) => s.href));
  const atajos = ATAJOS_MENU.filter((a) => esTitular || !!permisos?.[a.permiso]).filter(
    (a) => !baseHrefs.has(a.href)
  );
  return [...base, ...atajos];
}

// Aplica el orden personalizado (profiles.orden_menu, un arreglo de
// hrefs) que cada usuario arma arrastrando los botones del menú
// superior. "Inicio" y "Más" (ver SECCIONES_FIJAS) quedan siempre fijos
// -- Inicio de primero, Más de último -- y nunca se reordenan ni se
// guardan en orden_menu. Cualquier otra sección visible que no esté
// (todavía) en el orden guardado — porque es nueva o el usuario nunca la
// reordenó — se agrega en su orden normal, justo antes de "Más".
export function ordenarSecciones(links, ordenGuardado) {
  const inicio = links.filter((l) => l.href === "/dashboard");
  const mas = links.filter((l) => l.href === "/mas");
  const resto = links.filter((l) => !SECCIONES_FIJAS.includes(l.href));

  if (!ordenGuardado || ordenGuardado.length === 0) {
    return [...inicio, ...resto, ...mas];
  }

  const porHref = new Map(resto.map((l) => [l.href, l]));
  const ordenados = ordenGuardado.map((href) => porHref.get(href)).filter(Boolean);
  const usados = new Set(ordenados.map((l) => l.href));
  const nuevos = resto.filter((l) => !usados.has(l.href));

  return [...inicio, ...ordenados, ...nuevos, ...mas];
}
