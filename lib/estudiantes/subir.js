"use client";

import { createClient } from "@/lib/supabase/client";

// V54 -- Cómo sube el estudiante sus archivos desde el link (nota "App Gus
// interno", 1-nov: "No me esta dejando subir mi cédula ... Failed to fetch").
// Antes el archivo pasaba por el servidor de la app, y Vercel corta lo que
// pese más de ~4.5 MB (una foto del celular o un escaneo se pasa fácil).
// Ahora:
//   1. las fotos grandes se achican aquí mismo (se leen igual de bien);
//   2. el servidor revisa quién es y da un permiso para subir ese archivo;
//   3. el archivo va directo al almacenamiento (Supabase), sin pasar por Vercel;
//   4. el servidor confirma y lo guarda en su ficha.

const POR_EXTENSION = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", pdf: "application/pdf" };

// Algunos navegadores no dicen el tipo de un HEIC o de un PDF: se saca del nombre.
export function tipoDe(f) {
  if (f?.type) return f.type;
  const ext = String(f?.name || "").split(".").pop().toLowerCase();
  return POR_EXTENSION[ext] || "";
}

const SE_PUEDE_ACHICAR = ["image/jpeg", "image/png", "image/webp"];
const LADO_MAX = 2000;

function cargarImagen(f) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      res(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("no se pudo leer"));
    };
    img.src = url;
  });
}

// Una foto de más de ~1.5 MB o de más de 2000 px se pasa a JPG de 2000 px
// (sigue leyéndose bien una cédula). HEIC y PDF se suben como vienen. Si
// algo falla, se sube el original.
export async function achicar(f) {
  const tipo = tipoDe(f);
  if (!SE_PUEDE_ACHICAR.includes(tipo)) return f;
  try {
    const img = await cargarImagen(f);
    const lado = Math.max(img.naturalWidth, img.naturalHeight);
    if (f.size <= 1.5 * 1024 * 1024 && lado <= LADO_MAX) return f;
    const k = Math.min(1, LADO_MAX / lado);
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.85));
    if (!blob || blob.size >= f.size) return f;
    const nombre = String(f.name || "foto").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return f;
  }
}

const SIN_INTERNET = "No se pudo subir. Revisa tu internet e intenta otra vez.";

async function llamar(cuerpo) {
  let r;
  try {
    r = await fetch("/api/estudiantes/archivo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  } catch {
    throw new Error(SIN_INTERNET);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "No se pudo subir. Intenta otra vez.");
  return j;
}

export async function subirArchivo(id, que, original, estudianteId) {
  const archivo = await achicar(original);
  if (archivo.size > 10 * 1024 * 1024) throw new Error("El archivo pesa más de 10 MB.");
  const tipo = tipoDe(archivo);
  const base = { tipoDoc: id.tipoDoc, doc: id.doc, cel: id.cel, que, estudianteId: estudianteId || null, tipo, tamano: archivo.size, nombre: String(original.name || "").slice(0, 80) };
  const { ruta, token } = await llamar({ ...base, accion: "firmar" });
  let error;
  try {
    ({ error } = await createClient().storage.from("estudiantes-docs").uploadToSignedUrl(ruta, token, archivo, { contentType: tipo }));
  } catch {
    throw new Error(SIN_INTERNET);
  }
  if (error) throw new Error(/size|large|grande/i.test(error.message || "") ? "El archivo pesa más de 10 MB." : "No se pudo subir. Intenta otra vez.");
  await llamar({ ...base, accion: "listo", ruta });
}
