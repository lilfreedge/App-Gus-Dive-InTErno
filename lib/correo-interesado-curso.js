import { Resend } from "resend";

// V77 (pedido explícito, con foto: "cambia el mensaje y pon que le va a
// llegar por correo cuando haya un curso. Y al momento que le llegue ese
// correo que le llegue el URL directo para inscribirse en el curso") --
// mismo patrón que lib/correo-lista-espera.js: si no hay correo o no está
// configurado Resend, no pasa nada (no detiene el botón). Devuelve true si
// se mandó. El link de inscripción (con la fecha más próxima del curso, si
// hay una abierta) se arma del lado del cliente, igual que el botón de
// WhatsApp de al lado (ver Interesados.js, enviarCorreoCurso).
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

export function htmlInteresadoCurso({ nombre, curso, link }) {
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const l = escapar(link); // el link lleva "&" (la fecha y la marca del interesado)
  // V84 (notas del 15-nov, con foto del correo: "al correo que le llega a la
  // gente le hace falta el logo de Gus"). La imagen sale de la misma
  // dirección del link (la del app).
  let logo = "";
  try {
    logo = `${new URL(link).origin}/logo-gus-icon.png`;
  } catch {}
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ya puedes inscribirte</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;">
<tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe6ea;border-radius:12px;">
${logo ? `<tr><td style="padding:16px 18px 12px;border-radius:12px 12px 0 0;"><img src="${escapar(logo)}" alt="Gus Dive Center" height="34" style="display:block;height:34px;width:auto;border:0;"></td></tr>` : ""}
<tr><td style="background:#f6ce46;color:#2b2200;padding:14px 18px;${logo ? "" : "border-radius:12px 12px 0 0;"}${fuente}">
<div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE CENTER</div>
<div style="font-size:18px;font-weight:bold;margin-top:2px;">Ya puedes inscribirte</div>
</td></tr>
<tr><td style="padding:16px 18px;color:#1a2733;font-size:15px;line-height:1.5;${fuente}">
<p style="margin:0 0 12px;">Hola ${escapar(nombre)},</p>
<p style="margin:0 0 12px;">Ya tenemos un curso de <b>${escapar(curso)}</b> disponible. Entra al siguiente link para inscribirte:</p>
<p style="margin:0 0 16px;text-align:center;">
<a href="${l}" style="display:inline-block;background:#f6ce46;color:#2b2200;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px;">Inscribirme</a>
</p>
<p style="margin:0 0 12px;word-break:break-all;"><a href="${l}" style="color:#1f6b9a;">${l}</a></p>
<p style="margin:0;">¡Nos vemos pronto!<br>Gus Dive Center</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const mensaje = ({ correo, nombre, curso, link }) => ({
  from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
  to: String(correo).trim(),
  ...(process.env.REPORT_EMAIL_REPLY_TO ? { replyTo: process.env.REPORT_EMAIL_REPLY_TO } : {}),
  subject: `Ya puedes inscribirte - ${curso}`,
  html: htmlInteresadoCurso({ nombre, curso, link }),
  text: `Hola ${nombre},\n\nYa tenemos un curso de ${curso} disponible. Entra a este link para inscribirte:\n${link}\n\nGus Dive Center`,
});

export async function mandarCorreoInteresadoCurso({ correo, nombre, curso, link }) {
  if (!correoOk(correo) || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send(mensaje({ correo, nombre, curso, link }));
    return !error;
  } catch {
    return false;
  }
}

// V79 (maqueta V79, "1. B"): a varios de una vez, cada uno con su propio
// link. Va en un solo pedido a Resend (hasta 100 correos), para no chocar con
// su límite de pedidos por segundo. Devuelve true si Resend los aceptó.
export async function mandarCorreosInteresadoCurso(lista) {
  const buenos = (lista || []).filter((x) => correoOk(x.correo)).slice(0, 100);
  if (!buenos.length || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.batch.send(buenos.map(mensaje));
    return !error;
  } catch {
    return false;
  }
}
