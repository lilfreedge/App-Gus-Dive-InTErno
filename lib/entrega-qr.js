import { createHmac, timingSafeEqual } from "crypto";

// V91 (maqueta v92, aprobada): el QR que el instructor escanea para confirmar que
// recibió el presupuesto. Vence a los 15 minutos. No hace falta guardarlo en la
// base: el token trae la fecha y la hora en que vence, firmado con un secreto del
// servidor, así que no se puede inventar ni alargar.
export const VIGENCIA_QR_MIN = 15;

function clave() {
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHmac("sha256", base).update("gus-qr-entrega-v1").digest();
}

export function crearTokenEntrega(fechaId, ahora = Date.now()) {
  const exp = ahora + VIGENCIA_QR_MIN * 60 * 1000;
  const cuerpo = Buffer.from(`${fechaId}|${exp}`).toString("base64url");
  const firma = createHmac("sha256", clave()).update(cuerpo).digest("base64url");
  return { token: `${cuerpo}.${firma}`, expiraEn: new Date(exp).toISOString() };
}

// Devuelve { fechaId } si sirve, o { error: "vencido" | "invalido" }.
export function leerTokenEntrega(token, ahora = Date.now()) {
  const partes = String(token || "").split(".");
  if (partes.length !== 2) return { error: "invalido" };
  const [cuerpo, firma] = partes;
  const esperada = createHmac("sha256", clave()).update(cuerpo).digest("base64url");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { error: "invalido" };
  const [fechaId, exp] = Buffer.from(cuerpo, "base64url").toString("utf8").split("|");
  if (!fechaId || !Number(exp)) return { error: "invalido" };
  if (ahora > Number(exp)) return { error: "vencido", fechaId };
  return { fechaId, expiraEn: Number(exp) };
}

// Lo que el navegador del celular dice de sí mismo. No da el número ni el nombre.
export function describirAparato(userAgent = "") {
  const ua = String(userAgent);
  const equipo = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "Mac" : "Otro";
  const navegador = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navegador";
  return `${equipo} · ${navegador}`;
}
