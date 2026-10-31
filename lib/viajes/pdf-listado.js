// V52 -- El "Reporte de listado de buzos para proveedor" en PDF, hecho en el
// celular (o la computadora) con pdf-lib, para mandarlo directo por WhatsApp
// ("42. ... Descarta el poder enviar el reporte escrito por WhatsApp. La
// idea es mandarle el formato en PDF directo ... que tú le des a enviar por
// WhatsApp y él mismo te lo imprima y te mande a WhatsApp"). Es el mismo
// reporte de "Reporte / PDF": banda azul con el logo, lo que hace falta, los
// que necesitan equipo arriba y los demás abajo.
// `g` es uno de equipoViaje(db, v).reportes.
import { fechaLarga, fechaCorta, hoyISO, resumenTalla } from "./modelo";

let logoBytes = null;
async function logo() {
  if (logoBytes) return logoBytes;
  try {
    const r = await fetch("/logo-gus-icon.png");
    if (r.ok) logoBytes = new Uint8Array(await r.arrayBuffer());
  } catch {}
  return logoBytes;
}

export function nombrePdfListado(v, g) {
  const base = g.prov === "Gus" ? `Equipo que pone Gus - ${v.nombre}` : `Listado de buzos - ${v.nombre}`;
  return `${base} - ${fechaCorta(v.fecha)}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
}

export async function pdfListado(v, g) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  doc.setTitle(nombrePdfListado(v, g).replace(/\.pdf$/, ""));
  doc.setAuthor("Gus Dive Center");
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  let img = null;
  try {
    const b = await logo();
    if (b) img = await doc.embedPng(b);
  } catch {
    img = null;
  }

  const W = 595.28;
  const H = 841.89;
  const M = 36;
  const TW = W - M * 2;
  const AZUL = rgb(0x4e / 255, 0xba / 255, 0xe8 / 255);
  const NAVY = rgb(0x06 / 255, 0x32 / 255, 0x4f / 255);
  const TEXTO = rgb(0.1, 0.15, 0.2);
  const SUAVE = rgb(0.42, 0.48, 0.53);
  const LINEA = rgb(0.87, 0.9, 0.92);
  const SEC = rgb(0x1e / 255, 0x60 / 255, 0x91 / 255);
  const ROJO = rgb(0.84, 0.27, 0.27);

  const corta = (t, ancho, font, size) => {
    t = String(t ?? "");
    if (font.widthOfTextAtSize(t, size) <= ancho) return t;
    while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > ancho) t = t.slice(0, -1);
    return `${t}…`;
  };

  let page;
  let y;
  const nueva = (conBanda) => {
    page = doc.addPage([W, H]);
    if (!conBanda) {
      y = H - M;
      return;
    }
    const BH = 84;
    page.drawRectangle({ x: 0, y: H - BH, width: W, height: BH, color: AZUL });
    let tx = M;
    if (img) {
      const lh = 30;
      const lw = Math.min((img.width / img.height) * lh, 100);
      page.drawRectangle({ x: M, y: H - BH / 2 - lh / 2 - 5, width: lw + 12, height: lh + 10, color: rgb(1, 1, 1) });
      page.drawImage(img, { x: M + 6, y: H - BH / 2 - lh / 2, width: lw, height: lh });
      tx = M + lw + 12 + 14;
    }
    const k = g.prov === "Gus" ? "EQUIPO QUE PONE GUS" : `LISTADO DE BUZOS PARA ${String(g.prov).toUpperCase()}`;
    page.drawText(corta(k, W - M - tx, fb, 9), { x: tx, y: H - 26, size: 9, font: fb, color: NAVY });
    page.drawText(corta(v.nombre, W - M - tx, fb, 18), { x: tx, y: H - 47, size: 18, font: fb, color: NAVY });
    page.drawText(corta(`${fechaLarga(v.fecha)}${v.salida ? ` · ${v.salida}` : ""}`, W - M - tx, f, 10.5), { x: tx, y: H - 64, size: 10.5, font: f, color: NAVY });
    y = H - BH - 4;
  };
  const espacio = (alto) => {
    if (y - alto < M + 20) nueva(false);
  };
  const seccion = (t) => {
    espacio(60);
    y -= 22;
    page.drawText(t.toUpperCase(), { x: M, y, size: 9.5, font: fb, color: SEC });
    page.drawLine({ start: { x: M, y: y - 5 }, end: { x: M + TW, y: y - 5 }, thickness: 1.2, color: AZUL });
    y -= 8;
  };
  const RH = 19;
  const fila = (cols, { bold = false, color = TEXTO, size = 9.5 } = {}) => {
    let x = M;
    for (const c of cols) {
      const font = c.bold ?? bold ? fb : f;
      const t = corta(c.t, c.w - 8, font, size);
      const tw = font.widthOfTextAtSize(t, size);
      page.drawText(t, { x: c.der ? x + c.w - tw - 4 : x + 4, y: y - RH + 6, size, font, color: c.color || color });
      x += c.w;
    }
    page.drawLine({ start: { x: M, y: y - RH }, end: { x: M + TW, y: y - RH }, thickness: 0.5, color: LINEA });
    y -= RH;
  };

  nueva(true);

  // "9 buzos y 2 guías" (sin "· 4 necesitan equipo": "42. ... quita esto").
  if (g.prov !== "Gus") seccion(g.cuantos);

  if (g.totales.length) {
    seccion("Lo que hace falta");
    for (const t of g.totales) {
      espacio(RH);
      const r = resumenTalla(t);
      fila([
        { t: t.pz, w: TW * 0.42 },
        { t: `${t.n}${r ? ` · ${r}` : ""}`, w: TW * 0.58, color: t.faltan ? ROJO : null },
      ]);
    }
  }

  if (g.filas.length) {
    seccion(`${g.otros.length ? "Necesitan equipo" : "Por buzo"} (${g.filas.length})`);
    const n = g.totales.length;
    const wNum = 24;
    const wPz = n ? Math.min(70, (TW - wNum - 150) / n) : 0;
    const wNom = TW - wNum - wPz * n;
    const encabezado = () =>
      fila([{ t: "#", w: wNum }, { t: "Buzo", w: wNom }, ...g.totales.map((t) => ({ t: t.pz, w: wPz }))], { bold: true, color: SUAVE, size: 8.5 });
    encabezado();
    g.filas.forEach((x, i) => {
      if (y - RH < M + 20) {
        nueva(false);
        encabezado();
      }
      fila([
        { t: String(i + 1), w: wNum },
        { t: x.nombre, w: wNom },
        ...g.totales.map((t) => {
          const pz = x.piezas.find((p) => p.pz === t.pz);
          return { t: !pz ? "—" : pz.talla ? pz.talla : pz.falta ? "por confirmar" : "Sí", w: wPz, color: !pz ? SUAVE : pz.falta ? ROJO : null };
        }),
      ]);
    });
  }

  if (g.otros.length) {
    seccion(`${g.filas.length ? "No necesitan equipo" : "Buzos"} (${g.otros.length})`);
    g.otros.forEach((x, i) => {
      espacio(RH);
      fila([
        { t: String(g.filas.length + i + 1), w: 24 },
        { t: x.nombre, w: TW - 24 - 130 },
        { t: x.nota, w: 130, der: true, color: SUAVE },
      ]);
    });
  }

  espacio(30);
  const pie = `Gus Dive Center · ${fechaCorta(hoyISO())}`;
  page.drawText(pie, { x: M + TW - f.widthOfTextAtSize(pie, 9), y: y - 18, size: 9, font: f, color: SUAVE });

  return await doc.save();
}
