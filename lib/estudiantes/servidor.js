import { formatoCedula, soloDigitos } from "@/lib/viajes/modelo";
import { createHmac, timingSafeEqual } from "crypto";
import { filaABuzo } from "@/lib/viajes/datos";

// Control Estudiantes, lado del servidor (link del estudiante, sin cuenta).
// Corre con la llave del servidor. Al estudiante nunca se le devuelven sus
// datos guardados: solo su nombre corto, el celular tapado y lo de su curso
// (y eso último solo si pone también su celular).

export const docLimpio = (tipo, doc) => (tipo === "pasaporte" ? String(doc || "").toUpperCase().replace(/\s/g, "") : formatoCedula(doc));
export function docValido(tipo, doc) {
  if (tipo === "pasaporte") return String(doc || "").replace(/\s/g, "").length >= 6;
  return soloDigitos(doc).length === 11;
}

export async function buscarPorDoc(s, tipo, doc) {
  const valor = docLimpio(tipo, doc);
  if (!valor) return null;
  const { data } = await s.from("viajes_buzos").select("*").eq(tipo === "pasaporte" ? "pasaporte" : "documento", valor).maybeSingle();
  return data ? filaABuzo(data) : null;
}

// Que el celular que escribe sea el que tenemos guardado.
export const celCoincide = (b, cel) => !!b && soloDigitos(b.cel).length === 10 && soloDigitos(b.cel) === soloDigitos(cel);

export async function logLink(s, estudianteId, texto, despues) {
  await s.from("est_bitacora").insert({ estudiante_id: estudianteId || null, nombre: "Link", texto, despues: despues ?? null });
}

// V62 ("229", registrar a un menor de edad): el menor casi nunca tiene cédula,
// así que sus fotos y la firma del tutor se suben con un permiso firmado por
// el servidor (sirve solo para ese menor), en vez de cédula + celular.
const clave = () => process.env.EST_LINK_SECRETO || process.env.SUPABASE_SERVICE_ROLE_KEY || "gus";
export const tokenMenor = (buzoId) => createHmac("sha256", clave()).update(`menor:${buzoId}`).digest("hex").slice(0, 40);
export function tokenMenorValido(buzoId, token) {
  if (!buzoId || !token) return false;
  const a = Buffer.from(tokenMenor(String(buzoId)));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function buzoPorId(s, id) {
  const { data } = await s.from("viajes_buzos").select("*").eq("id", String(id || "")).maybeSingle();
  return data ? filaABuzo(data) : null;
}
// Años cumplidos a hoy (hora de RD).
export function edadHoy(nac) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nac || "")) return null;
  const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const [a, m, d] = nac.split("-").map(Number);
  const [ha, hm, hd] = hoy.split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}
