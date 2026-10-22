import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  seccionesInforme,
  recomendacionInformeTexto,
  GARANTIA_INFORME,
  GRACIAS_INFORME,
} from "./informe-mantenimiento";

// V32 -- El Informe de mantenimiento como documento: el CORREO (HTML) y el
// PDF adjunto en hoja carta, los dos con el mismo diseño que se ve en el
// app (banda azul marino con el logo, secciones con título gris, viñetas,
// recuadro verde/rojo de aprobado). Pedido explícito, maqueta aprobada:
// "el correo deja de mandar la tabla Campo/Valor: el cliente ve el informe
// dentro del correo con el mismo diseño del app y además le llega el PDF
// adjunto con ese mismo diseño".
//
// El contenido (qué secciones y en qué orden) sale de seccionesInforme()
// -- la misma lista que usa la vista del app -- para que nunca se
// desincronicen.

const C = {
  navy: "#0a3d62",
  texto: "#1a2733",
  suave: "#5c6b78",
  borde: "#dfe6ea",
  verde: "#2c9e5b",
  verdeFondo: "#e6f3eb",
  rojo: "#d64545",
  rojoFondo: "#fdecec",
  fondoCorreo: "#f4f7f9",
};

function escapar(t) {
  return String(t ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textoConSaltos(t) {
  return escapar(t).replace(/\r?\n/g, "<br>");
}

export function tituloYSubtituloInforme(orden) {
  const numero = orden.no_orden_fisico ?? orden.folio;
  return { numero, titulo: "Informe de mantenimiento", subtitulo: `Regulador — Orden #${numero}` };
}

// ---------------------------------------------------------------------------
// CORREO (HTML). Tablas y estilos en línea: es lo que respetan Gmail,
// Outlook y el correo del iPhone. `logoUrl` tiene que ser una dirección
// completa (https://...): los correos no muestran imágenes incrustadas en
// base64.
export function htmlInformeMantenimiento(orden, informe, { logoUrl } = {}) {
  const { titulo, subtitulo } = tituloYSubtituloInforme(orden);
  const secciones = seccionesInforme(orden, informe);
  const recomendacion = recomendacionInformeTexto(informe);
  const fuente = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

  const seccionHTML = (sec) => {
    const cuerpo = sec.items
      ? `<ul style="margin:6px 0 0;padding-left:18px;line-height:1.6;">${sec.items
          .map((i) => `<li>${escapar(i)}</li>`)
          .join("")}</ul>`
      : textoConSaltos(sec.texto);
    const detalle = sec.detalle
      ? `<div style="margin-top:2px;font-size:11.5px;color:${C.suave};">${escapar(sec.detalle)}</div>`
      : "";
    return (
      `<div style="margin-top:14px;">` +
      `<div style="font-size:11px;font-weight:700;color:${C.suave};text-transform:uppercase;">${escapar(sec.titulo)}</div>` +
      `<div style="margin-top:4px;font-size:13.5px;line-height:1.5;color:${C.texto};">${cuerpo}${detalle}</div>` +
      `</div>`
    );
  };

  const aprobado = !!informe.aprobado;
  const logo = logoUrl
    ? `<td width="1" style="padding-right:14px;vertical-align:middle;"><img src="${escapar(logoUrl)}" alt="Gus Dive" height="40" style="display:block;height:40px;width:auto;border:0;"></td>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(
    titulo
  )}</title></head>
<body style="margin:0;padding:0;background:${C.fondoCorreo};${fuente}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fondoCorreo};">
<tr><td align="center" style="padding:16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${C.borde};border-radius:14px;overflow:hidden;">
<tr><td style="background:${C.navy};padding:18px 20px;border-radius:14px 14px 0 0;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>${logo}<td style="vertical-align:middle;${fuente}">
<div style="color:#ffffff;font-size:18px;font-weight:700;">${escapar(titulo)}</div>
<div style="color:#d9e3ec;font-size:12.5px;margin-top:2px;">${escapar(subtitulo)}</div>
</td></tr></table>
</td></tr>
<tr><td style="padding:4px 18px 18px;${fuente}color:${C.texto};">
${secciones.map(seccionHTML).join("\n")}
<div style="margin-top:18px;padding:12px;border-radius:8px;text-align:center;font-weight:700;font-size:14px;background:${
    aprobado ? C.verdeFondo : C.rojoFondo
  };color:${aprobado ? C.verde : C.rojo};">${aprobado ? "&#10003; Aprobado para su uso" : "&#10005; No aprobado para su uso"}</div>
<div style="margin-top:14px;font-size:12.5px;color:${C.suave};text-align:center;">${escapar(GARANTIA_INFORME)}</div>
<div style="margin-top:14px;border-top:1px solid ${C.borde};padding-top:10px;font-size:12.5px;color:${C.suave};text-align:center;">Técnico: ${escapar(
    informe.tecnico || "—"
  )}</div>
${recomendacion ? seccionHTML({ titulo: "Recomendación de próximo mantenimiento", texto: recomendacion }) : ""}
<div style="margin-top:16px;font-size:12.5px;text-align:center;line-height:1.5;color:${C.texto};">${escapar(GRACIAS_INFORME)}</div>
</td></tr>
</table>
<div style="margin-top:10px;font-size:11.5px;color:${C.suave};${fuente}">También va adjunto en PDF, listo para guardar o imprimir.</div>
</td></tr></table>
</body></html>`;
}

// Versión en texto plano (para los correos que no muestran HTML).
export function textoInformeMantenimiento(orden, informe) {
  const { titulo, subtitulo } = tituloYSubtituloInforme(orden);
  const lineas = [`${titulo} — ${subtitulo.replace("Regulador — ", "")}`, ""];
  for (const sec of seccionesInforme(orden, informe)) {
    lineas.push(sec.titulo.toUpperCase());
    if (sec.items) sec.items.forEach((i) => lineas.push(`• ${i}`));
    else lineas.push(sec.texto);
    if (sec.detalle) lineas.push(sec.detalle);
    lineas.push("");
  }
  lineas.push(informe.aprobado ? "✓ Aprobado para su uso" : "✕ No aprobado para su uso", "");
  lineas.push(GARANTIA_INFORME, `Técnico: ${informe.tecnico || "—"}`);
  const rec = recomendacionInformeTexto(informe);
  if (rec) lineas.push("", "RECOMENDACIÓN DE PRÓXIMO MANTENIMIENTO", rec);
  lineas.push("", GRACIAS_INFORME);
  return lineas.join("\n");
}

// ---------------------------------------------------------------------------
// PDF en hoja carta (8.5 x 11 in), mismo diseño que el app impreso:
// banda azul marino de borde a borde arriba, contenido con márgenes de
// 0.6 in a los lados (los mismos que usa el app al imprimir).
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Las fuentes estándar del PDF (Helvetica) solo traen los caracteres del
// español y los signos comunes. Cualquier otro (un emoji en la Nota, por
// ejemplo) se quita, en vez de que falle el PDF entero.
function limpiadorPara(font) {
  const soportados = new Set(font.getCharacterSet());
  const reemplazos = { "‑": "-", "–": "-", "−": "-", " ": " ", " ": " ", " ": " " };
  return (t) =>
    Array.from(String(t ?? ""))
      .map((ch) => reemplazos[ch] ?? ch)
      .filter((ch) => ch === "\n" || soportados.has(ch.codePointAt(0)))
      .join("");
}

function envolver(texto, font, size, maxW) {
  const lineas = [];
  for (const parrafo of String(texto ?? "").split(/\r?\n/)) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    if (palabras.length === 0) {
      lineas.push("");
      continue;
    }
    let actual = "";
    for (const palabra of palabras) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (font.widthOfTextAtSize(prueba, size) <= maxW || !actual) actual = prueba;
      else {
        lineas.push(actual);
        actual = palabra;
      }
    }
    if (actual) lineas.push(actual);
  }
  return lineas.length > 0 ? lineas : [""];
}

export async function construirPDFInformeMantenimiento(orden, informe) {
  const { titulo, subtitulo } = tituloYSubtituloInforme(orden);
  const secciones = seccionesInforme(orden, informe);
  const recomendacion = recomendacionInformeTexto(informe);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${titulo} — Orden #${tituloYSubtituloInforme(orden).numero}`);
  pdfDoc.setAuthor("Gus Dive Center");
  const fR = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fB = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const limpiar = limpiadorPara(fR);

  let logo = null;
  try {
    logo = await pdfDoc.embedPng(fs.readFileSync(path.join(process.cwd(), "public", "logo-gus-icon.png")));
  } catch {
    logo = null;
  }

  // Medidas en puntos (72 por pulgada). 1 px del app = 0.75 pt.
  const PX = 0.75;
  const W = 612;
  const H = 792;
  const MX = 0.6 * 72; // márgenes a los lados, como el app impreso
  const ANCHO = W - MX * 2;
  const ABAJO = 0.5 * 72;
  const BANDA_PAD_Y = 0.4 * 72;
  const LOGO_H = 40 * PX;
  const BANDA_H = BANDA_PAD_Y * 2 + LOGO_H;

  const S = {
    etiqueta: 11 * PX,
    valor: 13.5 * PX,
    valorLinea: 13.5 * PX * 1.5,
    viñetaLinea: 13.5 * PX * 1.6,
    detalle: 11.5 * PX,
    chico: 12.5 * PX,
  };

  let page;
  let y;
  function paginaNueva(conBanda) {
    page = pdfDoc.addPage([W, H]);
    if (conBanda) {
      page.drawRectangle({ x: 0, y: H - BANDA_H, width: W, height: BANDA_H, color: hex(C.navy) });
      let tx = MX;
      if (logo) {
        const lw = (logo.width / logo.height) * LOGO_H;
        page.drawImage(logo, { x: MX, y: H - BANDA_PAD_Y - LOGO_H, width: lw, height: LOGO_H });
        tx = MX + lw + 14 * PX;
      }
      const centro = H - BANDA_H / 2;
      page.drawText(limpiar(titulo), { x: tx, y: centro + 1, size: 18 * PX, font: fB, color: rgb(1, 1, 1) });
      page.drawText(limpiar(subtitulo), {
        x: tx,
        y: centro - 12.5 * PX - 3,
        size: 12.5 * PX,
        font: fR,
        color: rgb(0.85, 0.89, 0.93),
      });
      y = H - BANDA_H - 22 * PX;
    } else {
      y = H - ABAJO;
    }
  }
  function asegurar(alto) {
    if (y - alto < ABAJO) paginaNueva(false);
  }

  function texto(t, { x = MX, size, font = fR, color = C.texto, centrado = false, ancho = ANCHO }) {
    const linea = limpiar(t);
    const w = font.widthOfTextAtSize(linea, size);
    page.drawText(linea, { x: centrado ? x + (ancho - w) / 2 : x, y, size, font, color: hex(color) });
  }

  function seccion(sec) {
    y -= 14 * PX;
    asegurar(S.etiqueta + S.valorLinea + 4);
    y -= S.etiqueta;
    texto(sec.titulo.toUpperCase(), { size: S.etiqueta, font: fB, color: C.suave });
    y -= 4 * PX;
    if (sec.items) {
      y -= 6 * PX;
      for (const item of sec.items) {
        const lineas = envolver(limpiar(item), fR, S.valor, ANCHO - 18 * PX);
        lineas.forEach((l, i) => {
          asegurar(S.viñetaLinea);
          y -= S.viñetaLinea;
          if (i === 0) {
            page.drawCircle({ x: MX + 7 * PX, y: y + S.valor * 0.33, size: 1.6, color: hex(C.texto) });
          }
          texto(l, { x: MX + 18 * PX, size: S.valor });
        });
      }
    } else {
      for (const l of envolver(limpiar(sec.texto), fR, S.valor, ANCHO)) {
        asegurar(S.valorLinea);
        y -= S.valorLinea;
        texto(l, { size: S.valor });
      }
    }
    if (sec.detalle) {
      y -= 2 * PX;
      for (const l of envolver(limpiar(sec.detalle), fR, S.detalle, ANCHO)) {
        asegurar(S.detalle * 1.4);
        y -= S.detalle * 1.4;
        texto(l, { size: S.detalle, color: C.suave });
      }
    }
  }

  paginaNueva(true);
  secciones.forEach(seccion);

  // Recuadro de aprobado / no aprobado.
  const aprobado = !!informe.aprobado;
  const cajaH = 12 * PX * 2 + 14 * PX * 1.3;
  y -= 18 * PX;
  asegurar(cajaH);
  page.drawRectangle({
    x: MX,
    y: y - cajaH,
    width: ANCHO,
    height: cajaH,
    color: hex(aprobado ? C.verdeFondo : C.rojoFondo),
  });
  const leyenda = aprobado ? "Aprobado para su uso" : "No aprobado para su uso";
  const tam = 14 * PX;
  const anchoLeyenda = fB.widthOfTextAtSize(leyenda, tam);
  const icono = tam * 0.8;
  const xIni = MX + (ANCHO - (icono + 5 + anchoLeyenda)) / 2;
  const base = y - cajaH / 2 - tam * 0.35;
  const colorCaja = hex(aprobado ? C.verde : C.rojo);
  if (aprobado) {
    page.drawLine({ start: { x: xIni, y: base + icono * 0.45 }, end: { x: xIni + icono * 0.38, y: base + icono * 0.08 }, thickness: 1.6, color: colorCaja });
    page.drawLine({ start: { x: xIni + icono * 0.38, y: base + icono * 0.08 }, end: { x: xIni + icono, y: base + icono * 0.85 }, thickness: 1.6, color: colorCaja });
  } else {
    page.drawLine({ start: { x: xIni + 1, y: base + 1 }, end: { x: xIni + icono - 1, y: base + icono - 1 }, thickness: 1.6, color: colorCaja });
    page.drawLine({ start: { x: xIni + 1, y: base + icono - 1 }, end: { x: xIni + icono - 1, y: base + 1 }, thickness: 1.6, color: colorCaja });
  }
  page.drawText(leyenda, { x: xIni + icono + 5, y: base, size: tam, font: fB, color: colorCaja });
  y -= cajaH;

  // Garantía.
  y -= 14 * PX;
  asegurar(S.chico * 1.4);
  y -= S.chico * 1.2;
  texto(GARANTIA_INFORME, { size: S.chico, color: C.suave, centrado: true });

  // Técnico, con la rayita arriba.
  y -= 14 * PX;
  asegurar(10 * PX + S.chico * 1.4);
  page.drawLine({ start: { x: MX, y }, end: { x: MX + ANCHO, y }, thickness: 0.75, color: hex(C.borde) });
  y -= 10 * PX + S.chico * 1.1;
  texto(`Técnico: ${informe.tecnico || "—"}`, { size: S.chico, color: C.suave, centrado: true });

  if (recomendacion) seccion({ titulo: "Recomendación de próximo mantenimiento", texto: recomendacion });

  // Gracias.
  y -= 16 * PX;
  for (const l of envolver(limpiar(GRACIAS_INFORME), fR, S.chico, ANCHO)) {
    asegurar(S.chico * 1.5);
    y -= S.chico * 1.5;
    texto(l, { size: S.chico, centrado: true });
  }

  return Buffer.from(await pdfDoc.save());
}
