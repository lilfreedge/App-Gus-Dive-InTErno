import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V37 -- Lee el número del horómetro de una foto con la IA de Claude
// (pedido: "el horómetro ponle un OCR de la foto"; aprobado "ok vamos").
// No hace falta "entrenar" nada: se le explica cómo son los horómetros de
// la tienda (contador de rodillos "HOURS 1/10": 5 dígitos blancos y el
// último, rojo, son las décimas -- fotos reales del 23-oct-2026).
//
// Necesita la llave ANTHROPIC_API_KEY en Vercel (la pone el Titular; nunca
// se escribe en el código ni en el chat). Sin la llave responde
// { ok: false, motivo: "sin_llave" } y el número se escribe a mano.
const INSTRUCCIONES =
  "Esta es la foto del horómetro de un compresor de buceo. Es un contador mecánico de rodillos " +
  "(dice HOURS 1/10): 5 rodillos blancos con las horas y, a la derecha, 1 rodillo rojo con las décimas. " +
  "Lee el número completo. Si un rodillo se ve a mitad de camino entre dos números, toma el menor. " +
  "Ignora los ceros a la izquierda. Responde SOLO el número, con punto para las décimas (por ejemplo 228.5). " +
  "Si en la foto no se ve un horómetro o no se puede leer, responde solo: NO";

export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!user) return NextResponse.json({ ok: false, motivo: "sesion" }, { status: 401 });
  if (!tieneAcceso(profile, "compresor_mantenimiento_registrar") && !profile?.is_admin) {
    return NextResponse.json({ ok: false, motivo: "permiso" }, { status: 403 });
  }

  const llave = process.env.ANTHROPIC_API_KEY;
  if (!llave) return NextResponse.json({ ok: false, motivo: "sin_llave" });

  let imagen = "";
  try {
    ({ imagen } = await request.json());
  } catch {
    // cuerpo inválido
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(imagen || "");
  if (!m) return NextResponse.json({ ok: false, motivo: "foto" }, { status: 400 });
  if (m[2].length > 6_000_000) return NextResponse.json({ ok: false, motivo: "foto" }, { status: 413 });

  const ctrl = new AbortController();
  const corte = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "x-api-key": llave,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
              { type: "text", text: INSTRUCCIONES },
            ],
          },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("horometro: respuesta de la IA", res.status, data?.error?.message);
      return NextResponse.json({ ok: false, motivo: res.status === 401 ? "llave" : "ia" });
    }
    const texto = (data?.content || []).map((c) => c?.text || "").join(" ").trim();
    const num = /(\d{1,6}(?:[.,]\d)?)/.exec(texto.replace(/\s+/g, ""));
    if (!num || /^NO\b/i.test(texto)) return NextResponse.json({ ok: false, motivo: "no_se_lee" });
    const horas = Math.round(parseFloat(num[1].replace(",", ".")) * 10) / 10;
    if (!Number.isFinite(horas) || horas < 0 || horas > 999999) {
      return NextResponse.json({ ok: false, motivo: "no_se_lee" });
    }
    return NextResponse.json({ ok: true, horas });
  } catch (e) {
    return NextResponse.json({ ok: false, motivo: e?.name === "AbortError" ? "tiempo" : "ia" });
  } finally {
    clearTimeout(corte);
  }
}
