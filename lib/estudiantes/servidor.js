import { formatoCedula, soloDigitos } from "@/lib/viajes/modelo";
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
