import { EVENTOS_AVISO } from "./modelo";
import { marcoCorreo, origenDeLink } from "../correo-formato";

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
export function correoAviso({ titulo, texto, url, evento, origen }) {
  const e = EVENTOS_AVISO.find((x) => x.k === evento);
  // V98: el marco común de los correos del app (logo y franja azul de Buceos).
  return marcoCorreo({
    origen: origen || origenDeLink(url),
    app: "buceos",
    etiqueta: "GUS DIVE CENTER · BUCEOS",
    titulo,
    cuerpo: `<p style="margin:0 0 14px;">${escapar(texto)}</p>
${url ? `<p style="margin:0 0 6px;"><a href="${escapar(url)}" style="display:inline-block;background:#06324f;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px;">Abrir en el app</a></p>` : ""}
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8795a1;">Te llega porque en Buceos tienes activado el aviso "${escapar(e?.t || evento)}" por correo. Lo cambia el Titular en Administración.<br>Gus Dive Center</p>`,
  });
}
