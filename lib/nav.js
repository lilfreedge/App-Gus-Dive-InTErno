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
  { href: "/mas", label: "Más", key: ["catalogo", "historial", "reportes", "solicitudes_almacen", "proximos_vencimientos"] },
];

// Accesos directos que se agregan al final del top nav. Historia:
// - Hasta el 29-sep-2026 eran un toggle manual de cada persona en Mi
//   Perfil ("Personalizar mi menú", profiles.menu_personalizado,
//   PersonalizarMenu.js).
// - 29-sep-2026 (v47), pedido explícito: "quitar la parte de personalizar
//   mi menu en usuarios, a segun lo tengan habilitado en administracion o
//   no" -- se quitaron los toggles y los atajos pasaron a salir solos
//   según los permisos (el componente y la columna no se borraron).
// - 6-oct-2026 (V29), pedido explícito: "no se ven los shortcut para uno
//   poder quitarlo o ponerlo del menu principal... quiero que lo pongas
//   como estaba antes" -- vuelven los toggles en Mi Perfil. Se mantiene
//   también el filtro por permiso: solo se ofrecen (y solo salen) los
//   atajos que la persona tiene habilitados en Administración; dentro de
//   esos, cada quien decide cuáles quiere ver. "Equipos"
// (tanques_hub) se quitó de aquí porque ya es una sección fija siempre
// visible (no tenía sentido como atajo). Cada atajo se revalida en cada
// carga contra `permiso` -- si a alguien le quitan/dan el permiso en
// Administración, el atajo desaparece/aparece solo, sin que el usuario
// tenga que tocar nada.
//
// BUG corregido (6-oct-2026, encontrado revisando por qué desaparecieron
// los toggles de Mi Perfil): `permiso` de Llenados/Inspección visual/
// Mantenimiento apuntaba a claves que no existen en profiles.permisos
// ("llenados", "inspeccion_visual", "mantenimiento_reguladores" -- son
// los ids de menu_personalizado, no permisos). Los permisos reales que se
// activan en Administración > Usuarios y permisos son registrar_llenado,
// registrar_inspeccion y registrar_mantenimiento (ver lib/roles.js). Con
// las claves equivocadas, esos 3 atajos solo le salían al Titular (que
// pasa siempre) -- a cualquier otra persona nunca, aunque tuviera el
// permiso. Compresores sí estaba bien.
export const ATAJOS_MENU = [
  { id: "llenados", href: "/tanques", label: "Llenados", permiso: "registrar_llenado" },
  { id: "inspeccion_visual", href: "/equipos/inspeccion-visual", label: "Inspección visual", permiso: "registrar_inspeccion" },
  // V29: atajo opcional a Pruebas hidrostáticas (apagado por default).
  { id: "pruebas_hidrostaticas", href: "/equipos/pruebas-hidrostaticas", label: "Hidrostáticas", permiso: "registrar_hidrostatica" },
  { id: "mantenimiento_reguladores", href: "/equipos/mantenimiento-reguladores", label: "Mantenimiento", permiso: "registrar_mantenimiento" },
  { id: "compresores", href: "/equipos/compresores", label: "Compresores", permiso: "compresores" },
  // V29: atajo opcional a Solicitudes al almacén (vive en Más).
  { id: "solicitudes", href: "/solicitudes", label: "Solicitudes", permiso: "solicitudes_almacen" },
  // V29: atajo opcional a Próximos vencimientos (vive en Más).
  { id: "proximos_vencimientos", href: "/vencimientos", label: "Vencimientos", permiso: "proximos_vencimientos" },
];

// Atajos que esta persona PUEDE tener (según sus permisos) -- los que se le
// ofrecen en "Personalizar mi menú" (Mi Perfil).
export function atajosPermitidos({ esTitular, permisos }) {
  return ATAJOS_MENU.filter((a) => esTitular || !!permisos?.[a.permiso]);
}

// Secciones del menú superior que quedan fijas: no se pueden arrastrar ni
// reordenar. "Inicio" siempre de primero, "Más" siempre de último.
export const SECCIONES_FIJAS = ["/dashboard", "/mas"];

// Secciones que puede ver este usuario, en orden, para el top nav y las
// flechas grandes de navegación entre pantallas. Incluye, al final, los
// atajos de ATAJOS_MENU cuyo permiso ya tiene este usuario, evitando
// repetir un href que ya esté en las secciones fijas.
// `menuPersonalizado` (profiles.menu_personalizado, ya mezclado con los
// defaults en lib/roles.js): si se pasa, un atajo solo sale si además está
// activado ahí. Si no se pasa, se muestran todos los permitidos.
export function seccionesVisibles({ esTitular, permisos, menuPersonalizado }) {
  const base = NAV_SECTIONS.filter((s) => {
    if (s.key === null) return true;
    if (esTitular) return true;
    if (Array.isArray(s.key)) return s.key.some((k) => permisos?.[k]);
    return !!permisos?.[s.key];
  });
  const baseHrefs = new Set(base.map((s) => s.href));
  const atajos = atajosPermitidos({ esTitular, permisos })
    .filter((a) => !menuPersonalizado || !!menuPersonalizado[a.id])
    .filter((a) => !baseHrefs.has(a.href));
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
