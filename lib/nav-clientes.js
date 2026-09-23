// Orden y definición de las 5 secciones del top nav de App Clientes
// (23-sep-2026, pedido explícito: flechas de navegación + drag & drop
// del menú). A diferencia de lib/nav.js (App Interno), aquí no hay
// secciones que aparezcan/desaparezcan según permiso -- el acceso a
// toda la app ya está gateado por un solo permiso (equipos_clientes) --
// así que no hace falta una función "seccionesVisibles" aparte.
export const NAV_SECTIONS_CLIENTES = [
  { href: "/app-clientes", label: "Inicio" },
  { href: "/app-clientes/ordenes", label: "Registro" },
  { href: "/app-clientes/clientes", label: "Listado de clientes" },
  { href: "/app-clientes/historial", label: "Listado de órdenes" },
  { href: "/app-clientes/mas", label: "Más" },
];

// Secciones que quedan fijas en el menú superior de App Clientes: no se
// pueden arrastrar ni reordenar (item 4, drag & drop del menú) --
// "Inicio" siempre de primero, "Más" siempre de último.
export const SECCIONES_FIJAS_CLIENTES = ["/app-clientes", "/app-clientes/mas"];

// Aplica el orden personalizado (profiles.orden_menu_clientes, un
// arreglo de hrefs) que cada usuario arma arrastrando los botones del
// menú superior de App Clientes. Columna aparte de profiles.orden_menu
// (que ya usa App Interno para su propio menú) para no pisar el orden
// guardado allá -- mismo patrón que lib/nav.js's ordenarSecciones.
export function ordenarSeccionesClientes(ordenGuardado) {
  const inicio = NAV_SECTIONS_CLIENTES.filter((l) => l.href === "/app-clientes");
  const mas = NAV_SECTIONS_CLIENTES.filter((l) => l.href === "/app-clientes/mas");
  const resto = NAV_SECTIONS_CLIENTES.filter((l) => !SECCIONES_FIJAS_CLIENTES.includes(l.href));

  if (!ordenGuardado || ordenGuardado.length === 0) {
    return [...inicio, ...resto, ...mas];
  }

  const porHref = new Map(resto.map((l) => [l.href, l]));
  const ordenados = ordenGuardado.map((href) => porHref.get(href)).filter(Boolean);
  const usados = new Set(ordenados.map((l) => l.href));
  const nuevos = resto.filter((l) => !usados.has(l.href));

  return [...inicio, ...ordenados, ...nuevos, ...mas];
}
