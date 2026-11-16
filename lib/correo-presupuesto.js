import { Resend } from "resend";

// V88 (maqueta V88, aprobada 16-nov-2026): el correo que pide el presupuesto
// de cada fecha nueva. Formato Gus (franja amarilla) con el logo de SNSI.
// Dinorah no entra al app: lee el correo y manda el presupuesto y las gorras
// a la tienda. Los correos salen de Administración › Correos automáticos.

export const RUBROS_PRESUPUESTO = [
  "Yolas (lanchas)",
  "Pizza para los días de teoría",
  "Entradas al Parque Nacional La Caleta",
  "Parqueo del instructor en el parque, los días de buceo",
];

const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

const lista = (nombres, vacio) =>
  nombres.length
    ? `<ol style="margin:0 0 12px;padding-left:20px;">${nombres.map((n) => `<li>${escapar(n)}</li>`).join("")}</ol>`
    : `<p style="margin:0 0 12px;color:#5c6b78;">${escapar(vacio)}</p>`;

export function htmlPresupuesto({ curso, fecha, inscritos, espera, gorras, origen }) {
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const logo = origen ? `${origen}/logo-snsi.png` : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presupuesto y gorras</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe6ea;border-radius:12px;">
${logo ? `<tr><td style="padding:16px 18px 12px;"><img src="${escapar(logo)}" alt="SNSI" height="34" style="display:block;height:34px;width:auto;border:0;"></td></tr>` : ""}
<tr><td style="background:#f6ce46;color:#2b2200;padding:14px 18px;${logo ? "" : "border-radius:12px 12px 0 0;"}${fuente}">
<div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE CENTER</div>
<div style="font-size:18px;font-weight:bold;margin-top:2px;">Presupuesto y gorras · ${escapar(curso)}, ${escapar(fecha)}</div>
</td></tr>
<tr><td style="padding:16px 18px;color:#1a2733;font-size:15px;line-height:1.5;${fuente}">
<p style="margin:0 0 12px;">Hola Dinorah,</p>
<p style="margin:0 0 12px;">Ya hay fecha para el curso de <b>${escapar(curso)}</b> el <b>${escapar(fecha)}</b>. Necesitamos que nos mandes a la tienda el presupuesto de:</p>
<ul style="margin:0 0 12px;padding-left:20px;">${RUBROS_PRESUPUESTO.map((r) => `<li>${escapar(r)}</li>`).join("")}</ul>
${gorras != null ? `<p style="margin:0 0 2px;font-weight:bold;">Gorras: ${gorras}</p><p style="margin:0 0 12px;">Una por cada estudiante de OWD inscrito.</p>` : ""}
<p style="margin:0 0 4px;font-weight:bold;">Inscritos (${inscritos.length})</p>
${lista(inscritos, "Todavía no hay inscritos.")}
${espera.length ? `<p style="margin:0 0 4px;font-weight:bold;">En lista de espera (${espera.length})</p>${lista(espera, "")}` : ""}
<p style="margin:0;">Gracias,<br>Gus Dive Center</p>
</td></tr></table></td></tr></table></body></html>`;
}

// Manda el correo a todos los correos configurados. Devuelve true si Resend lo aceptó.
export async function mandarPresupuesto({ para, curso, fecha, inscritos, espera, gorras, origen }) {
  const correos = [...new Set((para || []).map((x) => String(x).trim()).filter(correoOk))];
  if (!correos.length || !process.env.RESEND_API_KEY) return false;
  const texto = [
    `Hola Dinorah,`,
    `Ya hay fecha para el curso de ${curso} el ${fecha}. Necesitamos que nos mandes a la tienda el presupuesto de:`,
    ...RUBROS_PRESUPUESTO.map((r) => `- ${r}`),
    ...(gorras != null ? [`Gorras: ${gorras} (una por cada estudiante de OWD inscrito).`] : []),
    `Inscritos (${inscritos.length}): ${inscritos.join(", ") || "todavía no hay"}`,
    ...(espera.length ? [`En lista de espera (${espera.length}): ${espera.join(", ")}`] : []),
    `Gus Dive Center`,
  ].join("\n");
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: correos,
      ...(process.env.REPORT_EMAIL_REPLY_TO ? { replyTo: process.env.REPORT_EMAIL_REPLY_TO } : {}),
      subject: `Presupuesto y gorras · ${curso}, ${fecha}`,
      html: htmlPresupuesto({ curso, fecha, inscritos, espera, gorras, origen }),
      text: texto,
    });
    return !error;
  } catch {
    return false;
  }
}
