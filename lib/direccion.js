// V67 ("1. a", antes la 95): los links que salen del app (Compartir link, el
// código QR, Avisar por WhatsApp, los correos y los avisos) llevan siempre la
// dirección principal, aunque alguien haya abierto el app por otra dirección
// de Vercel. Cuando esté el dominio (app.gusdivecenter.com), se cambia aquí o
// con la variable NEXT_PUBLIC_DIRECCION_PRINCIPAL en Vercel. En la computadora
// de prueba (localhost) se usa la de ahí.
let deVercel = "";
try {
  deVercel = process.env.NEXT_PUBLIC_DIRECCION_PRINCIPAL || "";
} catch {}
export const DIRECCION_PRINCIPAL = String(deVercel || "https://app-gus-dive-in-t-erno.vercel.app").replace(/\/+$/, "");

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)$/;

// En el navegador: la dirección completa de una ruta del app.
export function urlPrincipal(ruta = "") {
  if (/^https?:\/\//.test(ruta)) return ruta;
  if (typeof window !== "undefined" && LOCAL.test(window.location.hostname)) return `${window.location.origin}${ruta}`;
  return `${DIRECCION_PRINCIPAL}${ruta}`;
}

// En el servidor: el comienzo de los links (para correos y avisos).
export function origenDe(request) {
  try {
    const u = new URL(request.url);
    if (LOCAL.test(u.hostname)) return u.origin;
  } catch {}
  return DIRECCION_PRINCIPAL;
}
