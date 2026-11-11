import { Resend } from "resend";
import { formatFecha } from "./format";

// Aviso por correo de cuenta nueva (V70, pedido explícito, 11-nov-2026:
// "quiero que me llegue un correo a felipe@gusdivecenter.com cada vez que
// alguien se cree una cuenta ... para yo aprobarlo") -- mismo patrón que
// el aviso de Solicitudes al almacén (lib/solicitudes-correo.js): se
// manda justo después de /registro, a los correos configurados en
// Administración > Correos automáticos (app_config.nuevas_cuentas_correos,
// migration_95.sql). Solo servidor (usa la llave de Resend).

function escaparHTML(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function construirCorreoNuevaCuenta({ nombre, correo }) {
  return `
    <div style="font-family:sans-serif;color:#1a2733;">
      <table cellpadding="0" cellspacing="0" style="width:100%;background:#36454f;border-radius:8px 8px 0 0;">
        <tr>
          <td style="padding:14px 16px;vertical-align:middle;">
            <div style="color:#fff;font-size:16px;font-weight:bold;">Cuenta nueva por aprobar</div>
            <div style="color:#cfe0ee;font-size:12px;margin-top:2px;">${escaparHTML(formatFecha(new Date().toISOString()))}</div>
          </td>
        </tr>
      </table>
      <div style="padding:16px;">
        <p style="margin-top:0;">Alguien acaba de crear una cuenta en el app de Gus Dive:</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 8px 4px 0;color:#5c6b78;">Nombre</td><td style="padding:4px 0;font-weight:bold;">${escaparHTML(nombre)}</td></tr>
          <tr><td style="padding:4px 8px 4px 0;color:#5c6b78;">Correo</td><td style="padding:4px 0;">${escaparHTML(correo)}</td></tr>
        </table>
        <p style="margin-top:18px;font-size:13px;color:#5c6b78;">Entra a Selecciona tu espacio › Usuarios nuevos para aprobarla (hasta que la apruebes, no puede entrar a ninguna pantalla).</p>
      </div>
    </div>
  `;
}

// Devuelve { ok: true } o { ok: false, error }. Nunca lanza -- un correo
// que no se pueda mandar no debe tumbar el registro de la cuenta.
export async function enviarAvisoNuevaCuenta({ nombre, correo, destinatarios }) {
  if (!destinatarios || destinatarios.length === 0) {
    return { ok: false, error: "No hay correos configurados (Administración › Correos automáticos)." };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: "Falta configurar RESEND_API_KEY en Vercel." };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: destinatarios,
      subject: `Cuenta nueva por aprobar — ${nombre}`,
      html: construirCorreoNuevaCuenta({ nombre, correo }),
    });
    if (error) return { ok: false, error: error?.message || error?.name || JSON.stringify(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Error al mandar el correo." };
  }
}
