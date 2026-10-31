// V51 -- Manuales de los equipos (migration_76.sql). Los mismos en App
// Interno y App Equipos de clientes ("20. sii, funciona. que sea el mismo
// en app interno y app equipos de clientes"); todos los ven, también el
// técnico. Se abren por /api/manuales/<id> (PDF de la carpeta "manuales" o
// el enlace que se pegó).

export const TIPOS_MANUAL = ["Reguladores", "Compresores", "BCD", "Computadoras", "Otro"];

const norm = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const modelosDe = (m) =>
  String(m?.modelos || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// "Scubapro MK25 / S600"
export const tituloManual = (m) => `${m?.marca || ""} ${modelosDe(m).join(" / ")}`.trim();

export const linkManual = (m) => `/api/manuales/${m.id}`;

// Los manuales de un equipo: la marca y alguno de los modelos tienen que
// salir en lo que se sabe del equipo (sin importar mayúsculas, espacios ni
// guiones). Cada texto se revisa por separado (por ejemplo, la 1ra etapa y
// la 2da etapa de un regulador), para no mezclar la marca de uno con el
// modelo de otro.
export function manualesPara(manuales, ...textos) {
  const lista = textos.flat().map(norm).filter(Boolean);
  if (!lista.length) return [];
  return (manuales || []).filter((m) => {
    const marca = norm(m.marca);
    if (!marca) return false;
    const modelos = modelosDe(m).map(norm).filter(Boolean);
    return lista.some((t) => t.includes(marca) && modelos.some((mo) => t.includes(mo)));
  });
}
