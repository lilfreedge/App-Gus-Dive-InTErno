import { Resend } from "resend";

// V68 ("15. ok intentemos", maqueta V68): cuando alguien se anota en una lista
// de espera (un curso de Control Estudiantes o un buceo), le llega un correo,
// si dejó su correo. Si no hay correo o no está configurado Resend, no pasa
// nada (no se detiene la inscripción). Devuelve true si se mandó.
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

export function htmlListaEspera({ nombre, que, whatsapp, buceo }) {
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const color = buceo ? "background:#4ebae8;color:#06324f;" : "background:#f6ce46;color:#2b2200;";
  const wa = whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, "").replace(/^(\d{10})$/, "1$1")}` : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Estás en la lista de espera</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;">
<tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe6ea;border-radius:12px;">
<tr><td style="${color}padding:14px 18px;border-radius:12px 12px 0 0;${fuente}">
<div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE CENTER</div>
<div style="font-size:18px;font-weight:bold;margin-top:2px;">Estás en la lista de espera</div>
</td></tr>
<tr><td style="padding:16px 18px;color:#1a2733;font-size:15px;line-height:1.5;${fuente}">
<p style="margin:0 0 12px;">Hola ${escapar(nombre)},</p>
<p style="margin:0 0 12px;">Te anotamos en la lista de espera de <b>${escapar(que)}</b>. ${buceo ? "Si se abre un cupo, te escribimos por WhatsApp." : "Cuando abramos una fecha, te escribimos por WhatsApp antes que a nadie."}</p>
<p style="margin:0 0 12px;">Si ya no te interesa o tienes alguna pregunta, responde este correo${wa ? ` o <a href="${wa}" style="color:#1f6b9a;">escríbenos por WhatsApp</a>` : ""}.</p>
<p style="margin:0;">¡Nos vemos pronto!<br>Gus Dive Center</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

export async function mandarListaEspera({ correo, nombre, que, whatsapp, buceo = false }) {
  if (!correoOk(correo) || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: String(correo).trim(),
      ...(process.env.REPORT_EMAIL_REPLY_TO ? { replyTo: process.env.REPORT_EMAIL_REPLY_TO } : {}),
      subject: `Estás en la lista de espera - ${que}`,
      html: htmlListaEspera({ nombre, que, whatsapp, buceo }),
      text: `Hola ${nombre},\n\nTe anotamos en la lista de espera de ${que}. ${buceo ? "Si se abre un cupo, te escribimos por WhatsApp." : "Cuando abramos una fecha, te escribimos por WhatsApp antes que a nadie."}\n\nSi ya no te interesa o tienes alguna pregunta, responde este correo.\n\nGus Dive Center`,
    });
    return !error;
  } catch {
    return false;
  }
}
