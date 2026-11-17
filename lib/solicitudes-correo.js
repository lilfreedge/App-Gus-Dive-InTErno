import { Resend } from "resend";
import { formatFecha } from "./format";
import { ordenarItems } from "./solicitudes";
import { marcoCorreo } from "./correo-formato";

// Aviso por correo al almacén de una solicitud nueva (V29, pedido
// explícito: "hay que avisarle por fuera, lo ideal es setear el dominio al
// app para que eso pueda funcionar bien"). Solo servidor (usa la llave de
// Resend). V98: el logo sale de la dirección del app (marcoCorreo). Mientras el dominio gusdivecenter.com
// no esté verificado en Resend, el remitente sigue siendo la dirección de
// prueba (REPORT_EMAIL_FROM sin cambiar) y Resend solo deja enviar al
// correo del dueño de la cuenta -- el aviso queda marcado con el error
// que devuelva Resend, y se puede reintentar desde la pantalla.

function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function construirCorreoSolicitud(solicitud, origen = "") {
  const items = ordenarItems(solicitud.items);
  const filas = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;font-weight:bold;">${escaparHTML(i.codigo_snapshot)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;">${escaparHTML(i.descripcion_snapshot || "")}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;text-align:right;">${escaparHTML(i.cantidad)}</td></tr>`
    )
    .join("");

  // V98: el marco común de los correos del app (logo y franja grafito).
  return marcoCorreo({
    origen,
    app: "interno",
    etiqueta: "GUS DIVE CENTER · APP INTERNO",
    titulo: `Solicitud de códigos #${solicitud.folio}`,
    cuerpo: `<p style="margin:0 0 4px;font-size:12px;color:#5c6b78;">${escaparHTML(solicitud.nombre_usuario_snapshot || "")} · ${escaparHTML(formatFecha(solicitud.created_at))}</p>
<p style="margin:0 0 10px;">La tienda está pidiendo estos códigos al almacén:</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">
<thead><tr style="background:#36454f;color:#fff;text-align:left;"><th style="padding:6px 8px;">Código</th><th style="padding:6px 8px;">Descripción</th><th style="padding:6px 8px;text-align:right;">Cantidad</th></tr></thead>
<tbody>${filas}</tbody>
</table>
${solicitud.nota ? `<p style="margin:14px 0 0;background:#eef3f6;border-radius:8px;padding:8px 10px;"><b>Nota:</b> ${escaparHTML(solicitud.nota)}</p>` : ""}
<p style="margin:18px 0 0;font-size:12px;color:#5c6b78;">Puedes responder este correo para contestarle directamente a quien hizo la solicitud.</p>`,
  });
}

// Devuelve { ok: true } o { ok: false, error }.
export async function enviarAvisoSolicitud({ solicitud, destinatarios, responderA, origen = "" }) {
  if (!destinatarios || destinatarios.length === 0) {
    return { ok: false, error: "No hay correos del almacén configurados (Administración › Correos automáticos)." };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "Falta configurar RESEND_API_KEY en Vercel." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: destinatarios,
    ...(responderA ? { replyTo: responderA } : {}),
    subject: `Solicitud de códigos #${solicitud.folio} — Gus Dive`,
    html: construirCorreoSolicitud(solicitud, origen),
  });
  if (error) {
    return { ok: false, error: error?.message || error?.name || JSON.stringify(error) };
  }
  return { ok: true };
}
