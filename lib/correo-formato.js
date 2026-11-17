// V98 ("recuerda siempre mantener el mismo formato para los correos que sean
// enviados desde el app"): el marco de los correos del app. Arriba los logos
// (Gus y, si va, SNSI), después la franja (del color de cada app; amarilla por
// defecto) con "GUS DIVE CENTER" y el título, y el cuerpo en blanco. Las imágenes salen de la dirección del app
// (`origen`); sin ella, el correo sale igual sin logos.
export const escaparCorreo = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const FUENTE_CORREO = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

// La franja va con el color de cada app (amarillo SNSI por defecto).
export const COLORES_CORREO = {
  estudiantes: { fondo: "#f6ce46", texto: "#2b2200" },
  interno: { fondo: "#36454f", texto: "#ffffff" },
  clientes: { fondo: "#06324f", texto: "#ffffff" },
  buceos: { fondo: "#4ebae8", texto: "#06324f" },
  alquiler: { fondo: "#cd392a", texto: "#ffffff" },
};
// Saca la dirección del app de un link completo ("https://…/algo" -> "https://…").
export function origenDeLink(link) {
  try {
    return new URL(link).origin;
  } catch {
    return "";
  }
}

// `etiqueta`: la línea chiquita de la franja (por defecto "GUS DIVE CENTER";
// los correos del equipo dicen de qué app vienen).
export function marcoCorreo({ origen = "", titulo, cuerpo, snsi = false, ancho = 560, app = "estudiantes", etiqueta = "GUS DIVE CENTER" }) {
  const color = COLORES_CORREO[app] || COLORES_CORREO.estudiantes;
  const f = FUENTE_CORREO;
  const img = (src, alt, h) => `<img src="${escaparCorreo(src)}" alt="${alt}" height="${h}" style="display:inline-block;height:${h}px;width:auto;border:0;vertical-align:middle;margin-right:12px;">`;
  const logos = origen ? `${img(`${origen}/logo-gus-icon.png`, "Gus Dive Center", 32)}${snsi ? img(`${origen}/logo-snsi.png`, "SNSI", 28) : ""}` : "";
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escaparCorreo(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f9;${f}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;"><tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${ancho}px;background:#ffffff;border:1px solid #dfe6ea;border-radius:12px;">
${logos ? `<tr><td style="padding:16px 18px 12px;">${logos}</td></tr>` : ""}
<tr><td style="background:${color.fondo};color:${color.texto};padding:14px 18px;${logos ? "" : "border-radius:12px 12px 0 0;"}${f}">
<div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">${escaparCorreo(etiqueta)}</div>
<div style="font-size:18px;font-weight:bold;margin-top:2px;">${escaparCorreo(titulo)}</div>
</td></tr>
<tr><td style="padding:16px 18px;color:#1a2733;font-size:15px;line-height:1.5;${f}">
${cuerpo}
</td></tr></table></td></tr></table></body></html>`;
}
