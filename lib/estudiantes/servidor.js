import { formatoCedula, soloDigitos, celValido, celGuardar } from "@/lib/viajes/modelo";
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
export const celCoincide = (b, cel) => !!b && celValido(b.cel) && celGuardar(b.cel) === celGuardar(cel);

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

// V63 ("162", Mi registro / "Mis documentos"): la foto y la firma se cambian
// solo cada 6 meses. La fecha sale del nombre del archivo ("foto-<ms>.jpg").
// Se puede volver a subir en la primera hora (por si se equivocó al registrarse).
export const SEIS_MESES = 182 * 86400000;
export function cuandoSeSubio(ruta) {
  const m = String(ruta || "").match(/-(\d{12,})\.[a-z]+$/);
  return m ? Number(m[1]) : null;
}
export function puedeCambiarArchivo(ruta, ahora = Date.now()) {
  if (!ruta) return { puede: true };
  const t = cuandoSeSubio(ruta);
  if (!t) return { puede: true };
  if (ahora - t < 3600000 || ahora - t >= SEIS_MESES) return { puede: true, desde: t };
  return { puede: false, desde: t, desdeCuando: new Date(t + SEIS_MESES).toISOString().slice(0, 10) };
}

// V64 ("279"): cambiar su celular desde el link, una vez al mes. Lo escribe
// dos veces; el número viejo queda en la bitácora. Devuelve { error } o { ok, viejo }.
export const UN_MES = 30 * 86400000;
export function puedeCambiarCel(b, ahora = Date.now()) {
  const t = b?.celCambiadoEn ? new Date(b.celCambiadoEn).getTime() : null;
  if (!t || ahora - t >= UN_MES) return { puede: true };
  return { puede: false, el: new Date(t - 4 * 3600000).toISOString().slice(0, 10), desde: new Date(t + UN_MES - 4 * 3600000).toISOString().slice(0, 10) };
}
export async function cambiarCelular(s, b, nuevo, otraVez) {
  const n = celGuardar(nuevo);
  if (!celValido(nuevo)) return { error: "Escribe el celular nuevo completo." };
  if (n !== celGuardar(otraVez)) return { error: "Los dos celulares no son iguales." };
  if (n === celGuardar(b.cel)) return { error: "Ese es el mismo celular que ya tenemos." };
  const p = puedeCambiarCel(b);
  if (!p.puede) return { error: `Ya cambiaste tu celular el ${p.el.split("-").reverse().join("/")}. Lo puedes cambiar otra vez desde el ${p.desde.split("-").reverse().join("/")}.` };
  const ahora = new Date().toISOString();
  let { error } = await s.from("viajes_buzos").update({ celular: n, cel_cambiado_en: ahora }).eq("id", b.id);
  // Sin la migration_92 todavía: se cambia igual (sin la fecha).
  if (error) ({ error } = await s.from("viajes_buzos").update({ celular: n }).eq("id", b.id));
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." };
  return { ok: true, viejo: celGuardar(b.cel), nuevo: n };
}
