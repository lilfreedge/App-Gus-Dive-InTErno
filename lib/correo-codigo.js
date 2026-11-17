import { Resend } from "resend";
import { marcoCorreo } from "@/lib/correo-formato";

// V97 (maqueta V96, "16. C"): el código de 6 números para entrar al app Gus
// Dive con la cédula o con el celular. Devuelve true si se mandó.
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

// "a••••@gmail.com": para decirle a dónde le llegó, sin enseñar el correo completo.
export function correoOculto(c) {
  const [u, d] = String(c || "").trim().split("@");
  if (!u || !d) return "";
  return `${u.slice(0, 1)}${"•".repeat(Math.min(6, Math.max(3, u.length - 1)))}@${d}`;
}

// V98: con el marco común de los correos del app (logo y franja amarilla).
export function htmlCodigo({ nombre, codigo, minutos, origen }) {
  const cuerpo = `<p style="margin:0 0 12px;">Hola ${escapar(nombre)},</p>
<p style="margin:0 0 12px;">Este es tu código para entrar al app de Gus Dive:</p>
<div style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#f4f7f9;border-radius:10px;padding:12px;text-align:center;color:#06324f;">${escapar(codigo)}</div>
<p style="margin:12px 0 0;color:#5c6b78;font-size:13px;">Vence en ${minutos} minutos. Si no lo pediste tú, no hagas nada: nadie puede entrar sin este código.</p>`;
  return marcoCorreo({ origen, titulo: "Tu código para entrar", cuerpo, ancho: 520 });
}

export async function mandarCodigo({ correo, nombre, codigo, minutos, origen = "" }) {
  if (!correoOk(correo) || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: String(correo).trim(),
      subject: `${codigo} es tu código para entrar a Gus Dive`,
      html: htmlCodigo({ nombre, codigo, minutos, origen }),
      text: `Hola ${nombre},\n\nTu código para entrar al app de Gus Dive es: ${codigo}\n\nVence en ${minutos} minutos. Si no lo pediste tú, no hagas nada: nadie puede entrar sin este código.\n\nGus Dive`,
    });
    return !error;
  } catch {
    return false;
  }
}
