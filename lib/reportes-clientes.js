import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { formatFechaDDMMAAAADeDate } from "./format";
import { tipoEquipoLabel } from "./tipo-equipo";

// PDF del reporte de una orden de App Equipos de clientes (items 5/15,
// pedido explícito, 25-sep-2026: "necesito que el reporte tenga el mismo
// formato que tienen los reportes del app interno"). App Interno arma su
// PDF (lib/reportes.js -> construirPDF) para una LISTA de movimientos en
// un rango de fechas -- una orden es un solo registro con muchos campos,
// así que el contenido no es el mismo, pero el formato sí: misma banda
// navy con el logo arriba, mismo estilo de tabla con encabezado navy y
// filas alternadas debajo (clase .reporte-preview-tabla en la vista web).
const NAVY = { r: 10 / 255, g: 61 / 255, b: 98 / 255 };

function envolverTexto(texto, font, size, maxW) {
  const palabras = String(texto ?? "").split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [""];
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (font.widthOfTextAtSize(prueba, size) <= maxW || !actual) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// `filas`: [{ label, value }] -- ya armadas por quien llama (misma forma
// que se ve en la ficha/reporte web), para no duplicar aquí las reglas de
// qué campo mostrar según el tipo de orden.
export async function construirPDFOrdenCliente({ titulo, subtitulo, filas }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImg = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-gus-icon.png");
    const logoBytes = fs.readFileSync(logoPath);
    logoImg = await pdfDoc.embedPng(logoBytes);
  } catch {
    logoImg = null;
  }

  const PAGE_W = 595.28; // A4
  const PAGE_H = 841.89;
  const MARGIN = 36;
  const BAND_H = 70;
  const HEADER_ROW_H = 22;
  const LINE_H = 13;
  const ROW_PAD = 7;

  const tableW = PAGE_W - MARGIN * 2;
  const colLabelW = 170;
  const colValueW = tableW - colLabelW;

  const LOGO_H = 32;
  const LOGO_MAX_W = 90;
  const TEXTO_GAP = 14;
  let logoW = 0;
  if (logoImg) {
    logoW = Math.min((logoImg.width / logoImg.height) * LOGO_H, LOGO_MAX_W);
  }
  const textoX = MARGIN + (logoImg ? logoW + TEXTO_GAP : 0);

  function nuevaPagina() {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: PAGE_H - BAND_H, width: PAGE_W, height: BAND_H, color: rgb(NAVY.r, NAVY.g, NAVY.b) });

    if (logoImg) {
      page.drawImage(logoImg, { x: MARGIN, y: PAGE_H - BAND_H / 2 - LOGO_H / 2, width: logoW, height: LOGO_H });
    }

    page.drawText(titulo, { x: textoX, y: PAGE_H - 30, size: 16, font: fontBold, color: rgb(1, 1, 1) });
    if (subtitulo) {
      page.drawText(subtitulo, { x: textoX, y: PAGE_H - 48, size: 10, font: fontRegular, color: rgb(0.85, 0.9, 0.95) });
    }

    return page;
  }

  function dibujarEncabezadoTabla(page, y) {
    page.drawRectangle({ x: MARGIN, y: y - HEADER_ROW_H, width: tableW, height: HEADER_ROW_H, color: rgb(NAVY.r, NAVY.g, NAVY.b) });
    page.drawText("Campo", { x: MARGIN + 6, y: y - HEADER_ROW_H + 7, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Valor", { x: MARGIN + colLabelW + 6, y: y - HEADER_ROW_H + 7, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    return y - HEADER_ROW_H;
  }

  let page = nuevaPagina();
  let y = PAGE_H - BAND_H - 24;
  y = dibujarEncabezadoTabla(page, y);

  filas.forEach((f, i) => {
    const lineas = envolverTexto(f.value || "—", fontRegular, 9, colValueW - 12);
    const rowH = Math.max(LINE_H * lineas.length + ROW_PAD, 22);

    if (y - rowH < MARGIN) {
      page = nuevaPagina();
      y = PAGE_H - BAND_H - 24;
      y = dibujarEncabezadoTabla(page, y);
    }

    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - rowH, width: tableW, height: rowH, color: rgb(0.96, 0.97, 0.98) });
    }

    page.drawText(f.label, { x: MARGIN + 6, y: y - LINE_H + 2, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.2) });
    lineas.forEach((linea, li) => {
      page.drawText(linea, {
        x: MARGIN + colLabelW + 6,
        y: y - LINE_H * (li + 1) + 2,
        size: 9,
        font: fontRegular,
        color: rgb(0.1, 0.15, 0.2),
      });
    });

    page.drawLine({
      start: { x: MARGIN, y: y - rowH },
      end: { x: MARGIN + tableW, y: y - rowH },
      thickness: 0.5,
      color: rgb(0.87, 0.9, 0.92),
    });

    y -= rowH;
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Mismas filas que muestra la pantalla de "Reporte" (app/app-clientes/
// reportes/[id]/page.js) -- se centraliza aquí para que el PDF (item 5)
// y el envío por correo (item 15) nunca se desincronicen de lo que se ve
// en pantalla. `serie` es el No. de serie del equipo (se busca aparte,
// vive en equipos_del_cliente, no en la orden).
export function filasReporteOrdenCliente(o, { serie } = {}) {
  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
  const esHidrostatica = (o.que_se_hara || "").toLowerCase().includes("hidrostat");
  const esReparacion = (o.que_se_hara || "").toLowerCase().includes("reparaci");
  const muestraRetorno = esReparacion || esHidrostatica;
  const f = (iso) => (iso ? formatFechaDDMMAAAADeDate(iso) : "—");

  const filas = [
    { label: "Cliente", value: o.cliente_nombre_snapshot || "—" },
    { label: "Fecha de ingreso", value: f(o.fecha) },
    { label: "Equipo", value: tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro) },
    { label: "Marca / Modelo", value: marcaModelo || "—" },
    { label: "No. de serie", value: serie || "—" },
    { label: "Estado", value: o.estado || "—" },
    { label: "Servicio a realizar", value: o.que_se_hara || "—" },
  ];

  if (o.autorizacion_cliente) {
    filas.push({
      label: "Autorización del cliente",
      value: [o.autorizacion_cliente, o.autorizacion_notas].filter(Boolean).join(" — "),
    });
  }

  if (esReparacion) filas.push({ label: "Fecha de envío a taller o proveedor", value: f(o.fecha_envio) });
  if (esHidrostatica) filas.push({ label: "Fecha de envío a prueba hidrostática", value: f(o.fecha_envio_hidrostatica) });
  if (muestraRetorno) filas.push({ label: "Fecha de retorno a tienda", value: f(o.fecha_retorno_tienda) });
  if (esHidrostatica) filas.push({ label: "Inspección visual realizada", value: o.inspeccion_visual_realizada ? "Listo" : "Pendiente" });

  filas.push({ label: "Fecha de listo para entrega", value: f(o.fecha_listo_entrega) });
  filas.push({ label: "Verificado por", value: o.verificado_por || "—" });

  const notifs = o.notificaciones_cliente || [];
  filas.push({
    label: "Notificaciones al cliente",
    value:
      notifs.length === 0
        ? "—"
        : notifs.map((n) => `${f(n.fecha)} — ${n.medio}${n.notas ? ` (${n.notas})` : ""}`).join(" | "),
  });

  filas.push({ label: "Fecha de entrega al cliente", value: f(o.fecha_entrega_cliente) });
  filas.push({ label: "Nombre de quien recibe", value: o.nombre_recibe || "—" });
  filas.push({ label: "Factura de repuesto o servicio", value: o.factura || "—" });
  filas.push({ label: "Repuestos utilizados", value: o.repuestos_usados || "—" });
  if (o.notas_tecnico_regulador) {
    filas.push({ label: "Notas del técnico sobre el regulador", value: o.notas_tecnico_regulador });
  }

  return filas;
}

// "Enviar por correo" (item 15, pedido explícito: "si como lo tenemos en
// app interno") -- mismo patrón que app/api/reportes/enviar-a-mi/route.js.
export async function enviarReporteOrdenPorCorreo({ correoDestino, tituloCorreo, pdfBuffer, nombreArchivo }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: [correoDestino],
    subject: tituloCorreo,
    html: `<p style="font-family:sans-serif;color:#1a2733;">Adjunto va el reporte de la orden, generado desde la app.</p>`,
    attachments: [{ filename: nombreArchivo, content: pdfBuffer.toString("base64") }],
  });
}
