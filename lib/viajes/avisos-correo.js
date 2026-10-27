import { EVENTOS_AVISO } from "./modelo";

// V44 -- El correo de los avisos de Viajes (lo usa lib/viajes/avisos.js).
function escapar(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function correoAviso({ titulo, texto, url, evento }) {
  const e = EVENTOS_AVISO.find((x) => x.k === evento);
  return `
    <div style="font-family:sans-serif;color:#1a2733;max-width:520px;">
      <div style="background:#4ebae8;color:#06324f;border-radius:10px 10px 0 0;padding:14px 16px;">
        <div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE · VIAJES/BUCEOS</div>
        <div style="font-size:18px;font-weight:bold;margin-top:2px;">${escapar(titulo)}</div>
      </div>
      <div style="border:1px solid #dfe6ea;border-top:none;border-radius:0 0 10px 10px;padding:16px;">
        <p style="margin:0 0 14px;font-size:15px;">${escapar(texto)}</p>
        ${url ? `<a href="${escapar(url)}" style="display:inline-block;background:#06324f;color:#fff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px;">Abrir el viaje</a>` : ""}
        <p style="margin:16px 0 0;font-size:12px;color:#8795a1;">Te llega porque en Viajes/Buceos tienes activado el aviso “${escapar(e?.t || evento)}” por correo. Lo cambia el Titular en ⚙ › Administración.</p>
      </div>
    </div>`;
}

