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

// Accesos directos configurables por cada usuario (profiles.menu_personalizado)
// que se agregan al final del top nav cuando están activados. `id` es la
// clave dentro de menu_personalizado. "Equipos" (tanques_hub) se quitó de
// aquí porque ya es una sección fija siempre visible (no tenía sentido
// como atajo opcional). `permiso`, si está presente, se revalida en cada
// carga (no solo cuando el usuario activó el atajo) -- así, si a alguien
// le quitan el permiso después, el atajo desaparece solo aunque siga
// "activado" en menu_personalizado.
export const ATAJOS_MENU = [
  { id: "llenados", href: "/tanques", label: "Llenados" },
  { id: "inspeccion_visual", href: "/equipos/inspeccion-visual", label: "Inspección visual" },
  { id: "mantenimiento_reguladores", href: "/equipos/mantenimiento-reguladores", label: "Mantenimiento" },
  { id: "compresores", href: "/equipos/compresores", label: "Compresores", permiso: "compresores" },
];

// Secciones del menú superior que quedan fijas: no se pueden arrastrar ni
// reordenar. "Inicio" siempre de primero, "Más" siempre de último.
export const SECCIONES_FIJAS = ["/dashboard", "/mas"];

// Secciones que puede ver este usuario, en orden, para el top nav y las
// flechas grandes de navegación entre pantallas. Incluye, al final, los
// atajos que el usuario activó en Mi Perfil (menuPersonalizado), evitando
// repetir un href que ya esté en las secciones fijas.
export function seccionesVisibles({ esTitular, permisos, menuPersonalizado }) {
  const base = NAV_SECTIONS.filter((s) => {
    if (s.key === null) return true;
    if (esTitular) return true;
    if (Array.isArray(s.key)) return s.key.some((k) => permisos?.[k]);
    return !!permisos?.[s.key];
  });
  const baseHrefs = new Set(base.map((s) => s.href));
  const atajos = (menuPersonalizado
    ? ATAJOS_MENU.filter((a) => {
        if (!menuPersonalizado[a.id]) return false;
        if (a.permiso) return esTitular || !!permisos?.[a.permiso];
        return true;
      })
    : []
  ).filter((a) => !baseHrefs.has(a.href));
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
