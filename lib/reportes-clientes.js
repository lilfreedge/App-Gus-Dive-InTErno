import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Resend } from "resend";
import { formatFechaDDMMAAAADeDate } from "./format";
import { tipoEquipoLabel } from "./tipo-equipo";
import { esServicioHidrostatica, esServicioReparacion } from "./ordenes-estado";

// PDF del reporte de una orden de App Equipos de clientes (items 5/15,
// pedido explícito, 25-sep-2026: "necesito que el reporte tenga el mismo
// formato que tienen los reportes del app interno"). App Interno arma su
// PDF (lib/reportes.js -> construirPDF) para una LISTA de movimientos en
// un rango de fechas -- una orden es un solo registro con muchos campos,
// así que el contenido no es el mismo, pero el formato sí: misma banda
// navy con el logo arriba, mismo estilo de tabla con encabezado navy y
// filas alternadas debajo (clase .reporte-preview-tabla en la vista web).
const NAVY = { r: 10 / 255, g: 61 / 255, b: 98 / 255 };

// V112: pdf-lib resta el "kerning" al medir, pero no al dibujar (drawText): el
// texto dibujado sale un poco más ancho que lo medido. Se mide letra por letra.
function medir(font, texto, size) {
  let w = 0;
  for (const ch of String(texto)) w += font.widthOfTextAtSize(ch, size);
  return w;
}

function envolverTexto(texto, font, size, maxW) {
  const palabras = String(texto ?? "").split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return [""];
  const lineas = [];
  let actual = "";
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (medir(font, prueba, size) <= maxW || !actual) {
      actual = prueba;
    } else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

// V112: como envolverTexto, pero con partes en negrita y partes normales en
// la misma línea (los puntos del descargo: "1. Título: texto…").
// partes: [{ texto, font }]. Devuelve líneas = [[{ texto, font }]].
function envolverMixto(partes, size, maxW) {
  const palabras = partes.flatMap((p) => String(p.texto || "").split(/\s+/).filter(Boolean).map((w) => ({ w, font: p.font })));
  const lineas = [];
  let actual = [];
  let ancho = 0;
  for (const pal of palabras) {
    const esp = actual.length ? medir(pal.font, " ", size) : 0;
    const w = medir(pal.font, pal.w, size);
    if (actual.length && ancho + esp + w > maxW) {
      lineas.push(actual);
      actual = [];
      ancho = 0;
    }
    actual.push(pal);
    ancho += (actual.length > 1 ? esp : 0) + w;
  }
  if (actual.length) lineas.push(actual);
  return lineas.map((l) =>
    l.reduce((acc, pal) => {
      const ult = acc[acc.length - 1];
      if (ult && ult.font === pal.font) ult.texto += ` ${pal.w}`;
      else acc.push({ texto: pal.w, font: pal.font, espacio: acc.length > 0 });
      return acc;
    }, [])
  );
}

// `filas`: [{ label, value }] -- ya armadas por quien llama (misma forma
// que se ve en la ficha/reporte web), para no duplicar aquí las reglas de
// qué campo mostrar según el tipo de orden.
// V57: `descargo` (opcional, lib/descargo.js) se dibuja después de la tabla.
export async function construirPDFOrdenCliente({ titulo, subtitulo, filas, descargo }) {
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
  let y = PAGE_H - BAND_H - (descargo ? 18 : 24);
  y = dibujarEncabezadoTabla(page, y);

  filas.forEach((f, i) => {
    const lineas = envolverTexto(f.value || "—", fontRegular, 9, colValueW - 12);
    const rowH = Math.max(LINE_H * lineas.length + ROW_PAD, descargo ? 19 : 22); // V112: un poco más bajas en el recibo, para que quepa en una hoja

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

  // V57 -- El Descargo de Responsabilidad al final del Recibo.
  // V112 ("necesito que salga en 1 sola página y abajo tenga una línea para
  // que el cliente firme"): se escoge el tamaño de letra más grande (9.5 a 7)
  // con el que el descargo y la firma caben en la misma hoja; la firma va
  // abajo ("Firma del cliente" con su nombre).
  if (descargo) {
    const anchoTexto = tableW;
    const FIRMA_H = 62;
    const bloques = (size) => [
      { texto: descargo.titulo, font: fontBold, size: size + 2, antes: 0, color: rgb(0.1, 0.15, 0.2) },
      { texto: descargo.subtitulo, font: fontBold, size: size + 0.5, antes: 1, color: rgb(0.1, 0.15, 0.2) },
      ...descargo.intro.map((t) => ({ texto: t, size, antes: 4 })),
      ...descargo.puntos.map((x, i) => ({ partes: [{ texto: `${i + 1}. ${x.t}:`, font: fontBold }, { texto: x.texto, font: fontRegular }], size, antes: 3, sangria: 8 })),
      { texto: descargo.cierre, font: fontBold, size, antes: 6 },
    ];
    // V112 ("la letra aún la veo muy pequeña"): empieza en 11 y baja de a poco.
    const paso = (sz) => sz * 1.3;
    const lineasDe = (b) => (b.partes ? envolverMixto(b.partes, b.size, anchoTexto - (b.sangria || 0)) : envolverTexto(b.texto, b.font || fontRegular, b.size, anchoTexto - (b.sangria || 0)));
    const altoDe = (size) => 14 + bloques(size).reduce((t, b) => t + (b.antes || 0) + lineasDe(b).length * paso(b.size), 0);
    const libre = y - MARGIN - FIRMA_H;
    let size = 11;
    while (size > 7 && altoDe(size) > libre) size -= 0.25;
    const cabe = altoDe(size) <= libre;
    const escribir = (b) => {
      const { font = fontRegular, size: sz, sangria = 0, antes = 0, color = rgb(0.2, 0.25, 0.3) } = b;
      const lineas = lineasDe(b);
      y -= antes;
      for (const linea of lineas) {
        if (y - paso(sz) < MARGIN) {
          page = nuevaPagina();
          y = PAGE_H - BAND_H - 24;
        }
        if (Array.isArray(linea)) {
          let x = MARGIN + sangria;
          for (const trozo of linea) {
            if (trozo.espacio) x += medir(trozo.font, " ", sz); // el espacio entre la negrita y el texto normal
            page.drawText(trozo.texto, { x, y: y - sz, size: sz, font: trozo.font, color: trozo.font === fontBold ? rgb(0.1, 0.15, 0.2) : color });
            x += medir(trozo.font, trozo.texto, sz);
          }
        } else {
          page.drawText(linea, { x: MARGIN + sangria, y: y - sz, size: sz, font, color });
        }
        y -= paso(sz);
      }
    };
    if (!cabe && y - 80 < MARGIN) {
      page = nuevaPagina();
      y = PAGE_H - BAND_H - 24;
    }
    y -= 14;
    bloques(size).forEach(escribir);

    // La firma: abajo de la hoja si cabe; si no, debajo del texto (o en otra hoja).
    if (y - FIRMA_H < MARGIN) {
      page = nuevaPagina();
      y = PAGE_H - BAND_H - 24;
    }
    // "Quita la línea de poner fecha": solo la firma.
    const yLinea = MARGIN + 34;
    const anchoFirma = tableW * 0.58;
    const negro = rgb(0.1, 0.15, 0.2);
    page.drawLine({ start: { x: MARGIN, y: yLinea }, end: { x: MARGIN + anchoFirma, y: yLinea }, thickness: 0.9, color: negro });
    page.drawText("Firma del cliente", { x: MARGIN, y: yLinea - 12, size: 9.5, font: fontBold, color: negro });
    if (subtitulo) page.drawText(subtitulo, { x: MARGIN, y: yLinea - 24, size: 9, font: fontRegular, color: rgb(0.36, 0.42, 0.47) });
  }

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
  const esHidrostatica = esServicioHidrostatica(o.que_se_hara);
  const esReparacion = esServicioReparacion(o.que_se_hara);
  // "Se trabajó en tienda" (1-oct-2026, migration_45.sql) -- ni envío ni
  // retorno aplican para esa orden.
  const trabajadoEnTienda = esReparacion && !!o.reparacion_en_tienda;
  const muestraRetorno = (esReparacion && !trabajadoEnTienda) || esHidrostatica;
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

  if (esReparacion && !trabajadoEnTienda) filas.push({ label: "Fecha de envío a taller o proveedor", value: f(o.fecha_envio) });
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
  // Renombrado a "Códigos a cobrar" (feedback sobre v40, pedido explícito:
  // "pon 'códigos a cobrar'") -- mismo campo (repuestos_usados), solo la
  // etiqueta cambió, igual que en la ficha y en "Actualizar estado".
  filas.push({ label: "Códigos a cobrar", value: o.repuestos_usados || "—" });
  // Renombrada a "Nota" (1-oct-2026, pedido explícito) -- mismo campo
  // notas_tecnico_regulador de siempre.
  if (o.notas_tecnico_regulador) {
    filas.push({ label: "Nota", value: o.notas_tecnico_regulador });
  }

  return filas;
}

// "Ver Recibo de la orden" (1-oct-2026, pedido explícito: "necesito que el
// boton 'ver recibo de orden' figure en todo tipo de orden. y quitale que
// aparezca esto: Estado, fecha de listo para entrega, verificado por,
// notificaciones al cliente, fecha de entrega al cliente, nombre de quien
// recibe, factura de repuesto o servicio, codigos a cobrar. La idea es que
// esto se pueda imprimir y el cliente tenga una constancia de lo que
// dejó") -- versión simplificada de filasReporteOrdenCliente, sin los
// campos operativos internos. Vista por default en
// app/app-clientes/reportes/[id]/page.js, con un toggle a "Ver recibo
// completo" (filasReporteOrdenCliente de arriba) para consulta interna.
// Disponible para cualquier tipo de equipo, no solo Reguladores.
export function filasReciboClienteOrden(o, { serie } = {}) {
  const marcaModelo = [o.equipo_marca_snapshot, o.equipo_modelo_snapshot].filter(Boolean).join(" ");
  const esHidrostatica = esServicioHidrostatica(o.que_se_hara);
  const esReparacion = esServicioReparacion(o.que_se_hara);
  const trabajadoEnTienda = esReparacion && !!o.reparacion_en_tienda;
  const muestraRetorno = (esReparacion && !trabajadoEnTienda) || esHidrostatica;
  const f = (iso) => (iso ? formatFechaDDMMAAAADeDate(iso) : "—");

  const filas = [
    { label: "Cliente", value: o.cliente_nombre_snapshot || "—" },
    { label: "Fecha de ingreso", value: f(o.fecha) },
    { label: "Equipo", value: tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro) },
    { label: "Marca / Modelo", value: marcaModelo || "—" },
    { label: "No. de serie", value: serie || "—" },
    { label: "Servicio a realizar", value: o.que_se_hara || "—" },
  ];

  if (o.autorizacion_cliente) {
    filas.push({
      label: "Autorización del cliente",
      value: [o.autorizacion_cliente, o.autorizacion_notas].filter(Boolean).join(" — "),
    });
  }

  if (esReparacion && !trabajadoEnTienda) filas.push({ label: "Fecha de envío a taller o proveedor", value: f(o.fecha_envio) });
  if (esHidrostatica) filas.push({ label: "Fecha de envío a prueba hidrostática", value: f(o.fecha_envio_hidrostatica) });
  if (muestraRetorno) filas.push({ label: "Fecha de retorno a tienda", value: f(o.fecha_retorno_tienda) });
  if (esHidrostatica) filas.push({ label: "Inspección visual realizada", value: o.inspeccion_visual_realizada ? "Listo" : "Pendiente" });

  // V40: la Nota del técnico es interna (pedido explícito: "la nota del
  // técnico es interna"), así que ya no sale en el recibo del cliente. En el
  // reporte completo (consulta interna) sí sigue.

  return filas;
}

// "Enviar por correo" (item 15, pedido explícito: "si como lo tenemos en
// app interno") -- mismo patrón que app/api/reportes/enviar-a-mi/route.js.
// `mensaje` (item 36, reutilizado para el Informe de mantenimiento) es
// opcional -- sin pasar nada, queda el texto de siempre.
// V32: `html` / `texto` (opcionales) -- el Informe de mantenimiento manda
// el informe completo DENTRO del correo (lib/informe-documento.js) en vez
// de la línea de siempre.
export async function enviarReporteOrdenPorCorreo({ correoDestino, tituloCorreo, pdfBuffer, nombreArchivo, mensaje, html, texto }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: [correoDestino],
    subject: tituloCorreo,
    html: html || `<p style="font-family:sans-serif;color:#1a2733;">${mensaje || "Adjunto va el reporte de la orden, generado desde la app."}</p>`,
    ...(texto ? { text: texto } : {}),
    attachments: [{ filename: nombreArchivo, content: pdfBuffer.toString("base64") }],
  });
}
