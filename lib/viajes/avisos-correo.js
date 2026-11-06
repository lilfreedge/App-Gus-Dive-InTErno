import { EVENTOS_AVISO } from "./modelo";

// V44 -- El correo de los avisos de Viajes (lo usa lib/viajes/avisos.js).
function escapar(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// V49 -- Versión en texto (sin HTML) del mismo correo. Los filtros de spam le
// suben puntos a un correo que viene solo en HTML (nota: "¿Por qué me están
// llegando estos spams?").
export function correoAvisoTexto({ titulo, texto, url, evento }) {
  const e = EVENTOS_AVISO.find((x) => x.k === evento);
  return [
    "Gus Dive · Buceos",
    "",
    titulo,
    "",
    texto,
    ...(url ? ["", `Abrir en el app: ${url}`] : []),
    "",
    `Te llega porque en Buceos tienes activado el aviso "${e?.t || evento}" por correo. Lo cambia el Titular en Administración.`,
  ].join("\n");
}

// V61 (nota del 4-nov: "todavía me están llegando a spam los correos del
// app"): un documento HTML completo (con <html>, <head> y tablas), como el
// del Informe de mantenimiento que sí llega bien. Los filtros de spam le
// suben puntos a un correo que es solo un pedazo de HTML sin <html>.
export function correoAviso({ titulo, texto, url, evento }) {
  const e = EVENTOS_AVISO.find((x) => x.k === evento);
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;">
<tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe6ea;border-radius:12px;">
<tr><td style="background:#4ebae8;color:#06324f;padding:14px 18px;border-radius:12px 12px 0 0;${fuente}">
<div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE CENTER - BUCEOS</div>
<div style="font-size:18px;font-weight:bold;margin-top:2px;">${escapar(titulo)}</div>
</td></tr>
<tr><td style="padding:16px 18px;color:#1a2733;${fuente}">
<p style="margin:0 0 14px;font-size:15px;line-height:1.5;">${escapar(texto)}</p>
${url ? `<p style="margin:0 0 6px;"><a href="${escapar(url)}" style="display:inline-block;background:#06324f;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px;">Abrir en el app</a></p>` : ""}
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8795a1;">Te llega porque en Buceos tienes activado el aviso "${escapar(e?.t || evento)}" por correo. Lo cambia el Titular en Administración.<br>Gus Dive Center</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
