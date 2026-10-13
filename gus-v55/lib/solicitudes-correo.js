import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { formatFecha } from "./format";
import { ordenarItems } from "./solicitudes";

// Aviso por correo al almacén de una solicitud nueva (V29, pedido
// explícito: "hay que avisarle por fuera, lo ideal es setear el dominio al
// app para que eso pueda funcionar bien"). Solo servidor (lee el logo del
// disco y usa la llave de Resend). Mientras el dominio gusdivecenter.com
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

function logoDataUri() {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-gus-icon.png");
    return "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
  } catch {
    return null;
  }
}

export function construirCorreoSolicitud(solicitud) {
  const items = ordenarItems(solicitud.items);
  const logo = logoDataUri();
  const filas = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;font-weight:bold;">${escaparHTML(i.codigo_snapshot)}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;">${escaparHTML(i.descripcion_snapshot || "")}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #dfe6ea;text-align:right;">${escaparHTML(i.cantidad)}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;color:#1a2733;">
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#0a3d62;border-radius:8px 8px 0 0;">
        <tr>
          ${logo ? `<td style="width:56px;padding:14px 0 14px 16px;vertical-align:middle;"><img src="${logo}" height="32" style="display:block;height:32px;width:auto;" alt="Gus Dive"></td>` : ""}
          <td style="padding:14px 16px;vertical-align:middle;">
            <div style="color:#fff;font-size:16px;font-weight:bold;">Solicitud de códigos #${escaparHTML(solicitud.folio)}</div>
            <div style="color:#cfe0ee;font-size:12px;margin-top:2px;">${escaparHTML(solicitud.nombre_usuario_snapshot || "")} · ${escaparHTML(formatFecha(solicitud.created_at))}</div>
          </td>
        </tr>
      </table>
      <div style="padding:16px;">
        <p style="margin-top:0;">La tienda está pidiendo estos códigos al almacén:</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#0a3d62;color:#fff;text-align:left;">
              <th style="padding:6px 8px;">Código</th><th style="padding:6px 8px;">Descripción</th><th style="padding:6px 8px;text-align:right;">Cantidad</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        ${solicitud.nota ? `<p style="margin-top:14px;background:#eef3f6;border-radius:8px;padding:8px 10px;"><b>Nota:</b> ${escaparHTML(solicitud.nota)}</p>` : ""}
        <p style="margin-top:18px;font-size:12px;color:#5c6b78;">Puedes responder este correo para contestarle directamente a quien hizo la solicitud.</p>
      </div>
    </div>
  `;
}

// Devuelve { ok: true } o { ok: false, error }.
export async function enviarAvisoSolicitud({ solicitud, destinatarios, responderA }) {
  if (!destinatarios || destinatarios.length === 0) {
    return { ok: false, error: "No hay correos del almacén configurados (Administración › Solicitudes al almacén)." };
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
    html: construirCorreoSolicitud(solicitud),
  });
  if (error) {
    return { ok: false, error: error?.message || error?.name || JSON.stringify(error) };
  }
  return { ok: true };
}
