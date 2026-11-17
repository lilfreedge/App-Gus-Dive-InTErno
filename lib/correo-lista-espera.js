import { Resend } from "resend";
import { marcoCorreo } from "./correo-formato";

// V68 ("15. ok intentemos", maqueta V68): cuando alguien se anota en una lista
// de espera (un curso de Control Estudiantes o un buceo), le llega un correo,
// si dejó su correo. Si no hay correo o no está configurado Resend, no pasa
// nada (no se detiene la inscripción). Devuelve true si se mandó.
const escapar = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());

export function htmlListaEspera({ nombre, que, whatsapp, buceo, origen = "" }) {
  const wa = whatsapp ? `https://wa.me/${String(whatsapp).replace(/\D/g, "").replace(/^(\d{10})$/, "1$1")}` : "";
  // V98: el marco común de los correos del app (con el logo).
  return marcoCorreo({
    origen,
    app: buceo ? "buceos" : "estudiantes",
    titulo: "Estás en la lista de espera",
    cuerpo: `<p style="margin:0 0 12px;">Hola ${escapar(nombre)},</p>
<p style="margin:0 0 12px;">Te anotamos en la lista de espera de <b>${escapar(que)}</b>. ${buceo ? "Si se abre un cupo, te escribimos por WhatsApp." : "Cuando abramos una fecha, te escribimos por WhatsApp antes que a nadie."}</p>
<p style="margin:0 0 12px;">Si ya no te interesa o tienes alguna pregunta, responde este correo${wa ? ` o <a href="${wa}" style="color:#1f6b9a;">escríbenos por WhatsApp</a>` : ""}.</p>
<p style="margin:0;">¡Nos vemos pronto!<br>Gus Dive Center</p>`,
  });
}

export async function mandarListaEspera({ correo, nombre, que, whatsapp, buceo = false, origen = "" }) {
  if (!correoOk(correo) || !process.env.RESEND_API_KEY) return false;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: String(correo).trim(),
      ...(process.env.REPORT_EMAIL_REPLY_TO ? { replyTo: process.env.REPORT_EMAIL_REPLY_TO } : {}),
      subject: `Estás en la lista de espera - ${que}`,
      html: htmlListaEspera({ nombre, que, whatsapp, buceo, origen }),
      text: `Hola ${nombre},\n\nTe anotamos en la lista de espera de ${que}. ${buceo ? "Si se abre un cupo, te escribimos por WhatsApp." : "Cuando abramos una fecha, te escribimos por WhatsApp antes que a nadie."}\n\nSi ya no te interesa o tienes alguna pregunta, responde este correo.\n\nGus Dive Center`,
    });
    return !error;
  } catch {
    return false;
  }
}
