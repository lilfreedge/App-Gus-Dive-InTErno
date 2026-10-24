"use client";

// V37 -- Lee el número del horómetro de la foto (pedido del hermano de Pipe:
// "el horómetro ponle un OCR de la foto"; aprobado "ok vamos"). La foto se
// achica en el teléfono (para que suba rápido) y se manda a
// /api/horometro, que se la pasa a la IA de Claude. Devuelve
// { ok: true, horas } o { ok: false, motivo }.
async function achicar(file, maxLado = 1200) {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, w, h);
  if (bitmap.close) bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export async function leerHorometro(file) {
  if (!file) return { ok: false, motivo: "sin_foto" };
  let imagen;
  try {
    imagen = await achicar(file);
  } catch {
    return { ok: false, motivo: "foto" };
  }
  try {
    const res = await fetch("/api/horometro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagen }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, motivo: data?.motivo || "error" };
    return data;
  } catch {
    return { ok: false, motivo: "red" };
  }
}
