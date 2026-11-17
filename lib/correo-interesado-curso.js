import { Resend } from "resend";
import { marcoCorreo, origenDeLink } from "./correo-formato";

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
  const l = escapar(link); // el link lleva "&" (la fecha y la marca del interesado)
  // V84: con el logo de Gus (sale de la misma dirección del link). V98: el
  // marco común de los correos del app.
  return marcoCorreo({
    origen: origenDeLink(link),
    titulo: "Ya puedes inscribirte",
    cuerpo: `<p style="margin:0 0 12px;">Hola ${escapar(nombre)},</p>
<p style="margin:0 0 12px;">Ya tenemos un curso de <b>${escapar(curso)}</b> disponible. Entra al siguiente link para inscribirte:</p>
<p style="margin:0 0 16px;text-align:center;">
<a href="${l}" style="display:inline-block;background:#f6ce46;color:#2b2200;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px;">Inscribirme</a>
</p>
<p style="margin:0 0 12px;word-break:break-all;"><a href="${l}" style="color:#1f6b9a;">${l}</a></p>
<p style="margin:0;">¡Nos vemos pronto!<br>Gus Dive Center</p>`,
  });
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
