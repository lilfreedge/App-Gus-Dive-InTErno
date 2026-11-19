import { Resend } from "resend";
import { marcoCorreo, escaparCorreo } from "@/lib/correo-formato";
import { totalLinea, totalHoja } from "@/lib/estudiantes/presupuesto";

// V88 (maqueta V88, aprobada 16-nov-2026): el correo que pide el presupuesto
// de cada fecha nueva. Formato Gus (franja amarilla) con el logo de SNSI.
// V98: con montos (el presupuesto predeterminado del curso) y el marco común
// de los correos (lib/correo-formato.js: logos de Gus y SNSI).
// Dinorah no entra al app: lee el correo y manda el presupuesto y las gorras
// a la tienda. Los correos salen de Control Estudiantes › Más › Correos automáticos (V110).

export const RUBROS_PRESUPUESTO = [
  "Yolas (lanchas)",
  "Pizza para los días de teoría",
  "Entradas al Parque Nacional La Caleta",
  "Parqueo del instructor en el parque, los días de buceo",
];

const correoOk = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c || "").trim());
const rdC = (x) => `RD$${(Math.round(Number(x) * 100) / 100).toLocaleString("en-US")}`;

const lista = (nombres, vacio) =>
  nombres.length
    ? `<ol style="margin:0 0 12px;padding-left:20px;">${nombres.map((n) => `<li>${escaparCorreo(n)}</li>`).join("")}</ol>`
    : `<p style="margin:0 0 12px;color:#5c6b78;">${escaparCorreo(vacio)}</p>`;

// V98 (maqueta V99): el detalle, organizado como la hoja de la tienda: una
// tabla por sección (concepto, precio, cantidad, total) con su subtotal.
function tablaSeccion(s) {
  const td = "padding:6px 8px;border:1px solid #dfe6ea;font-size:13px;";
  const conMontos = s.lineas.filter((l) => !l.info);
  const textos = s.lineas.filter((l) => l.info);
  const sub = conMontos.reduce((a, l) => a + totalLinea(l), 0);
  return `<div style="margin:14px 0 4px;font-size:13px;font-weight:bold;color:#1a2733;">${escaparCorreo(s.t || "Sin nombre")}</div>
${textos.map((l) => `<div style="font-size:13px;color:#5c6b78;margin:0 0 3px;">${escaparCorreo(l.t)}</div>`).join("")}
${conMontos.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr style="background:#f4f7f9;"><td style="${td}font-weight:bold;">Concepto</td><td style="${td}font-weight:bold;text-align:right;">Precio</td><td style="${td}font-weight:bold;text-align:center;">Cant.</td><td style="${td}font-weight:bold;text-align:right;">Total</td></tr>
${conMontos.map((l) => `<tr><td style="${td}">${escaparCorreo(l.t)}</td><td style="${td}text-align:right;">${rdC(l.precio)}</td><td style="${td}text-align:center;">${escaparCorreo(l.cant)}</td><td style="${td}text-align:right;">${rdC(totalLinea(l))}</td></tr>`).join("")}
<tr><td colspan="3" style="${td}text-align:right;font-weight:bold;background:#fafbfc;">Total ${escaparCorreo(s.t || "")}</td><td style="${td}text-align:right;font-weight:bold;background:#fafbfc;">${rdC(sub)}</td></tr>
</table>` : ""}`;
}

// V110 (pedido explícito): al final del detalle, el total de todo sumado.
function filaTotal(total) {
  const td = "padding:8px;border:1px solid #1a2733;font-size:14px;font-weight:bold;";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:14px;">
<tr style="background:#1a2733;color:#ffffff;"><td style="${td}color:#ffffff;">Presupuesto total</td><td style="${td}color:#ffffff;text-align:right;">${rdC(total)}</td></tr>
</table>`;
}

export function htmlPresupuesto({ curso, fecha, inscritos, espera, gorras, origen, detalle }) {
  const hoja = detalle?.hoja;
  const conMontos = hoja && hoja.secciones?.length;
  // V110 (pedido explícito): "Hola," sin nombre.
  const cuerpo = `<p style="margin:0 0 12px;">Hola,</p>
${
  conMontos
    ? `<p style="margin:0 0 10px;">Este es el presupuesto para el curso de <b>${escaparCorreo(curso)}</b> del <b>${escaparCorreo(fecha)}</b>:</p>
<div style="background:#f4f7f9;border-radius:10px;padding:14px;text-align:center;margin:0 0 14px;">
<div style="font-size:13px;color:#5c6b78;">Presupuesto total</div>
<div style="font-size:28px;font-weight:bold;color:#1a2733;">${rdC(totalHoja(hoja))}</div>
<div style="font-size:13px;color:#5c6b78;">${escaparCorreo(detalle.estudiantes)} estudiante${detalle.estudiantes === 1 ? "" : "s"}</div>
</div>`
    : `<p style="margin:0 0 12px;">Ya hay fecha para el curso de <b>${escaparCorreo(curso)}</b> el <b>${escaparCorreo(fecha)}</b>. Necesitamos que nos mandes a la tienda el presupuesto de:</p>
<ul style="margin:0 0 12px;padding-left:20px;">${RUBROS_PRESUPUESTO.map((r) => `<li>${escaparCorreo(r)}</li>`).join("")}</ul>`
}
${gorras != null ? `<p style="margin:0 0 2px;font-weight:bold;">Gorras: ${gorras}</p><p style="margin:0 0 12px;">Una por cada estudiante de OWD inscrito.</p>` : ""}
<p style="margin:0 0 4px;font-weight:bold;">Inscritos (${inscritos.length})</p>
${lista(inscritos, "Todavía no hay inscritos.")}
${espera.length ? `<p style="margin:0 0 4px;font-weight:bold;">En lista de espera (${espera.length})</p>${lista(espera, "")}` : ""}
${conMontos ? `<div style="margin-top:6px;padding-top:10px;border-top:1px solid #eef3f6;font-size:12px;font-weight:bold;letter-spacing:.06em;color:#5c6b78;">DETALLE</div>${hoja.secciones.map(tablaSeccion).join("")}${filaTotal(totalHoja(hoja))}` : ""}
<p style="margin:16px 0 0;">Gracias,<br>Gus Dive Center</p>`;
  return marcoCorreo({ origen, titulo: `Presupuesto y gorras · ${curso}, ${fecha}`, cuerpo, snsi: true });
}

// Manda el correo a todos los correos configurados. Devuelve true si Resend lo aceptó.
export async function mandarPresupuesto({ para, curso, fecha, inscritos, espera, gorras, origen, detalle }) {
  const correos = [...new Set((para || []).map((x) => String(x).trim()).filter(correoOk))];
  if (!correos.length || !process.env.RESEND_API_KEY) return false;
  const texto = [
    `Hola,`,
    ...(detalle?.hoja?.secciones?.length
      ? [
          `Este es el presupuesto para el curso de ${curso} del ${fecha}: ${rdC(totalHoja(detalle.hoja))} (${detalle.estudiantes} estudiantes).`,
          ...detalle.hoja.secciones.flatMap((sec) => [`${sec.t}:`, ...sec.lineas.map((l) => (l.info ? `  ${l.t}` : `  ${l.t}: ${rdC(l.precio)} x ${l.cant} = ${rdC(totalLinea(l))}`))]),
          `Presupuesto total: ${rdC(totalHoja(detalle.hoja))}`,
        ]
      : [`Ya hay fecha para el curso de ${curso} el ${fecha}. Necesitamos que nos mandes a la tienda el presupuesto de:`, ...RUBROS_PRESUPUESTO.map((r) => `- ${r}`)]),
    ...(gorras != null ? [`Gorras: ${gorras} (una por cada estudiante de OWD inscrito).`] : []),
    `Inscritos (${inscritos.length}): ${inscritos.join(", ") || "todavía no hay"}`,
    ...(espera.length ? [`En lista de espera (${espera.length}): ${espera.join(", ")}`] : []),
    `Gus Dive Center`,
  ].join("\n");
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
      to: correos,
      ...(process.env.REPORT_EMAIL_REPLY_TO ? { replyTo: process.env.REPORT_EMAIL_REPLY_TO } : {}),
      subject: `Presupuesto y gorras · ${curso}, ${fecha}`,
      html: htmlPresupuesto({ curso, fecha, inscritos, espera, gorras, origen, detalle }),
      text: texto,
    });
    return !error;
  } catch {
    return false;
  }
}
