// Orden y definición de las 5 secciones del top nav de App Clientes
// (23-sep-2026, pedido explícito: flechas de navegación + drag & drop
// del menú). A diferencia de lib/nav.js (App Interno), aquí no hay
// secciones que aparezcan/desaparezcan según permiso -- el acceso a
// toda la app ya está gateado por un solo permiso (equipos_clientes) --
// así que no hace falta una función "seccionesVisibles" aparte.
export const NAV_SECTIONS_CLIENTES = [
  { href: "/app-clientes", label: "Inicio" },
  { href: "/app-clientes/ordenes", label: "Registro de Órdenes" },
  { href: "/app-clientes/clientes", label: "Listado de clientes" },
  { href: "/app-clientes/mas", label: "Más" },
];
// "Listado de órdenes" se sacó de aquí (23-sep-2026, pedido explícito:
// "ya se! pon listado de ordenes dentro de 'mas'") -- ahora vive como
// tarjeta dentro del hub "Más" (app/app-clientes/mas/page.js), no en el
// menú superior. Sigue siendo una ruta válida (/app-clientes/historial),
// solo dejó de ser una de las secciones fijas/reordenables de arriba.

// Secciones que quedan fijas en el menú superior de App Clientes: no se
// pueden arrastrar ni reordenar (item 4, drag & drop del menú) --
// "Inicio" siempre de primero, "Más" siempre de último.
export const SECCIONES_FIJAS_CLIENTES = ["/app-clientes", "/app-clientes/mas"];

// Accesos directos opcionales de App Equipos de clientes (23-sep-2026,
// pedido explícito: "agrega boton opcional (asi como esta en app
// interno) para que la gente puedan ver shortcut de reportes en su
// menú, en caso de que asi lo quieran") -- mismo mecanismo que
// lib/nav.js -> ATAJOS_MENU de App Interno: se agregan al final del
// menú superior solo si el usuario los activó en Mi Perfil
// (profiles.menu_personalizado_clientes, columna aparte de la de App
// Interno para no pisarla).
export const ATAJOS_MENU_CLIENTES = [
  { id: "reportes", href: "/app-clientes/reportes", label: "Reportes" },
];

// Aplica el orden personalizado (profiles.orden_menu_clientes, un
// arreglo de hrefs) que cada usuario arma arrastrando los botones del
// menú superior de App Clientes, e incluye los atajos opcionales que
// haya activado (menuPersonalizadoClientes) -- se agregan al set
// reordenable, igual que en App Interno. Columna aparte de
// profiles.orden_menu (que ya usa App Interno para su propio menú) para
// no pisar el orden guardado allá -- mismo patrón que lib/nav.js's
// ordenarSecciones.
export function ordenarSeccionesClientes(ordenGuardado, menuPersonalizadoClientes) {
  const inicio = NAV_SECTIONS_CLIENTES.filter((l) => l.href === "/app-clientes");
  const mas = NAV_SECTIONS_CLIENTES.filter((l) => l.href === "/app-clientes/mas");
  const baseResto = NAV_SECTIONS_CLIENTES.filter((l) => !SECCIONES_FIJAS_CLIENTES.includes(l.href));
  const atajos = menuPersonalizadoClientes
    ? ATAJOS_MENU_CLIENTES.filter((a) => !!menuPersonalizadoClientes[a.id])
    : [];
  const resto = [...baseResto, ...atajos];

  if (!ordenGuardado || ordenGuardado.length === 0) {
    return [...inicio, ...resto, ...mas];
  }

  const porHref = new Map(resto.map((l) => [l.href, l]));
  const ordenados = ordenGuardado.map((href) => porHref.get(href)).filter(Boolean);
  const usados = new Set(ordenados.map((l) => l.href));
  const nuevos = resto.filter((l) => !usados.has(l.href));

  return [...inicio, ...ordenados, ...nuevos, ...mas];
}
