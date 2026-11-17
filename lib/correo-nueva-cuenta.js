import { Resend } from "resend";
import { formatFecha } from "./format";
import { marcoCorreo } from "./correo-formato";

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

export function construirCorreoNuevaCuenta({ nombre, correo, origen = "" }) {
  // V98: el marco común de los correos del app (logo y franja grafito).
  return marcoCorreo({
    origen,
    app: "interno",
    etiqueta: "GUS DIVE CENTER · APP INTERNO",
    titulo: "Cuenta nueva por aprobar",
    ancho: 520,
    cuerpo: `<p style="margin:0 0 4px;font-size:12px;color:#5c6b78;">${escaparHTML(formatFecha(new Date().toISOString()))}</p>
<p style="margin:0 0 10px;">Alguien acaba de crear una cuenta en el app de Gus Dive:</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
<tr><td style="padding:4px 8px 4px 0;color:#5c6b78;">Nombre</td><td style="padding:4px 0;font-weight:bold;">${escaparHTML(nombre)}</td></tr>
<tr><td style="padding:4px 8px 4px 0;color:#5c6b78;">Correo</td><td style="padding:4px 0;">${escaparHTML(correo)}</td></tr>
</table>
<p style="margin:16px 0 0;font-size:13px;color:#5c6b78;">Entra a Selecciona tu espacio › Usuarios nuevos para aprobarla (hasta que la apruebes, no puede entrar a ninguna pantalla).</p>`,
  });
}

// Devuelve { ok: true } o { ok: false, error }. Nunca lanza -- un correo
// que no se pueda mandar no debe tumbar el registro de la cuenta.
export async function enviarAvisoNuevaCuenta({ nombre, correo, destinatarios, origen = "" }) {
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
      html: construirCorreoNuevaCuenta({ nombre, correo, origen }),
    });
    if (error) return { ok: false, error: error?.message || error?.name || JSON.stringify(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Error al mandar el correo." };
  }
}
