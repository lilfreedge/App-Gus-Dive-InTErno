import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatFecha, formatFechaDDMMAAAA } from "./format";

const NAVY = { r: 10 / 255, g: 61 / 255, b: 98 / 255 };

// Trae las salidas y/o llenados de tanques dentro de un rango de fechas,
// con filtros opcionales (usuario, código de artículo, motivo, tipo de gas).
// `supabase` puede ser el cliente normal (con sesión) o el de servicio (sin
// sesión, para el cron).
export async function obtenerDatosReporte(
  supabase,
  { tipo, desde, hasta, usuarioId, codigo, motivo, tipoGas }
) {
  const desdeISO = new Date(desde).toISOString();
  // "hasta" incluye todo ese día
  const hastaDate = new Date(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  const hastaISO = hastaDate.toISOString();

  let salidas = [];
  if (tipo !== "llenados" && tipo !== "tanques") {
    let q = supabase
      .from("salidas_con_nombre")
      .select("*")
      .gte("created_at", desdeISO)
      .lte("created_at", hastaISO)
      .order("created_at", { ascending: true });
    if (usuarioId) q = q.eq("user_id", usuarioId);
    if (codigo) q = q.ilike("articulo", `%${codigo}%`);
    if (motivo && motivo !== "Todos") q = q.eq("motivo", motivo);
    const { data, error } = await q;
    if (error) {
      throw new Error(`Error consultando salidas: ${error.message || JSON.stringify(error)}`);
    }
    salidas = data || [];
  }

  let tanques = [];
  if (tipo !== "salidas") {
    let q = supabase
      .from("llenados_con_nombre")
      .select("*")
      .gte("created_at", desdeISO)
      .lte("created_at", hastaISO)
      .order("created_at", { ascending: true });
    if (usuarioId) q = q.eq("user_id", usuarioId);
    if (tipoGas && tipoGas !== "Todos") q = q.eq("tipo_gas", tipoGas);
    const { data, error } = await q;
    if (error) {
      throw new Error(`Error consultando llenados: ${error.message || JSON.stringify(error)}`);
    }
    tanques = data || [];
  }

  return { salidas, tanques };
}

// Personas que han registrado al menos una salida o un llenado, para el
// filtro "Usuario" de Reportes (no es la lista fija de "Autorizado por").
export async function obtenerUsuariosConMovimientos(supabase) {
  const [{ data: s }, { data: t }] = await Promise.all([
    supabase.from("salidas").select("user_id, nombre_usuario_snapshot"),
    supabase.from("llenados_tanques").select("user_id, nombre_usuario_snapshot"),
  ]);

  const mapa = new Map();
  for (const r of [...(s || []), ...(t || [])]) {
    if (!mapa.has(r.user_id)) {
      mapa.set(r.user_id, r.nombre_usuario_snapshot || "(sin nombre)");
    }
  }

  return Array.from(mapa.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function filaComun(item, tabla) {
  return {
    folio: item.folio,
    fecha: formatFechaDDMMAAAA(item.created_at),
    codigoTipo: tabla === "salidas" ? item.articulo : "Llenados de tanque",
    usuario: item.full_name,
    motivoGas: tabla === "salidas" ? item.motivo : item.tipo_gas,
    cantidad: item.cantidad,
  };
}

function filasReporte({ salidas, tanques }) {
  return [
    ...salidas.map((s) => filaComun(s, "salidas")),
    ...tanques.map((t) => filaComun(t, "llenados_tanques")),
  ].sort((a, b) => a.folio - b.folio);
}

// El título del reporte y los encabezados de las columnas "Código/Tipo" y
// "Motivo/Gas" cambian según qué tipo de dato se pidió — si es solo
// Salidas o solo Llenados ya no hace falta la barra "/".
export function tituloReporte(tipo) {
  if (tipo === "salidas") return "Reporte de salidas";
  if (tipo === "llenados" || tipo === "tanques") return "Reporte de llenados";
  return "Reporte de salidas y llenados";
}

function columnasDinamicas(tipo) {
  if (tipo === "salidas") return { col1: "Código", col2: "Motivo" };
  if (tipo === "llenados" || tipo === "tanques") return { col1: "Tipo", col2: "Gas" };
  return { col1: "Código/Tipo", col2: "Motivo/Gas" };
}

export function construirXLSX({ salidas, tanques }, { desde, hasta, tipo } = {}) {
  const wb = XLSX.utils.book_new();
  const filas = filasReporte({ salidas, tanques });
  const { col1, col2 } = columnasDinamicas(tipo);

  const encabezado = [col1, "Cantidad", col2, "Usuario", "Fecha", "No."];
  const aoa = [
    ["GUS DIVE CENTER — " + tituloReporte(tipo)],
    [desde && hasta ? `Del ${desde} al ${hasta}` : ""],
    [],
    encabezado,
    ...filas.map((f) => [
      f.codigoTipo,
      f.cantidad,
      f.motivoGas,
      f.usuario,
      f.fecha,
      f.folio,
    ]),
  ];

  if (filas.length === 0) {
    aoa.push(["Sin datos en el rango elegido"]);
  }

  const hoja = XLSX.utils.aoa_to_sheet(aoa);
  hoja["!cols"] = [
    { wch: 26 },
    { wch: 10 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 8 },
  ];
  hoja["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }];

  // Mejor esfuerzo de estilo: la edición "community" de la librería xlsx
  // no siempre conserva los estilos de celda al escribir el archivo, pero
  // se dejan puestos por si el visor los respeta.
  const estiloTitulo = { font: { bold: true, sz: 14, color: { rgb: "0A3D62" } } };
  const estiloHeader = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "0A3D62" } },
  };
  if (hoja["A1"]) hoja["A1"].s = estiloTitulo;
  encabezado.forEach((_, i) => {
    const ref = XLSX.utils.encode_cell({ r: 3, c: i });
    if (hoja[ref]) hoja[ref].s = estiloHeader;
  });

  XLSX.utils.book_append_sheet(wb, hoja, "Reporte");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });
}

export function construirCSV({ salidas, tanques }, { tipo } = {}) {
  const filas = filasReporte({ salidas, tanques });
  const { col1, col2 } = columnasDinamicas(tipo);
  const encabezado = [col1, "Cantidad", col2, "Usuario", "Fecha", "No."];

  const out = [
    encabezado,
    ...filas.map((f) => [
      f.codigoTipo,
      f.cantidad,
      f.motivoGas,
      f.usuario,
      f.fecha,
      f.folio,
    ]),
  ];

  return out
    .map((fila) => fila.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function construirResumenHTML({ salidas, tanques, desde, hasta }) {
  const totalTanques = tanques.reduce((acc, t) => acc + Number(t.cantidad), 0);

  const filasSalidas = salidas
    .map(
      (s) =>
        `<tr><td>#${s.folio}</td><td>${formatFecha(s.created_at)}</td><td>${s.full_name}</td><td>${s.articulo}</td><td>${s.cantidad}</td><td>${s.motivo}</td></tr>`
    )
    .join("");

  // Encabezado con logo: usa una tabla (no flex/absolute) a propósito —
  // en un correo, una celda de ancho fijo para el logo y otra que fluye
  // para el texto nunca se encima, a diferencia del diseño anterior.
  let logoDataUri = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-gus-icon.png");
    logoDataUri = "data:image/png;base64," + fs.readFileSync(logoPath).toString("base64");
  } catch {
    logoDataUri = null;
  }

  const encabezado = `
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#0a3d62;border-radius:8px 8px 0 0;">
      <tr>
        ${
          logoDataUri
            ? `<td style="width:56px;padding:14px 0 14px 16px;vertical-align:middle;"><img src="${logoDataUri}" height="32" style="display:block;height:32px;width:auto;" alt="Gus Dive"></td>`
            : ""
        }
        <td style="padding:14px 16px;vertical-align:middle;">
          <div style="font-family:sans-serif;color:#fff;font-size:16px;font-weight:bold;">Reporte semanal — Gus Dive</div>
          <div style="font-family:sans-serif;color:#cfe0ee;font-size:12px;margin-top:2px;">Del ${desde} al ${hasta}</div>
        </td>
      </tr>
    </table>
  `;

  return `
    <div style="font-family: sans-serif; color: #1a2733;">
      ${encabezado}
      <div style="padding:16px;">
        <p><strong>${salidas.length}</strong> salidas registradas · <strong>${totalTanques}</strong> tanques llenados</p>
        ${
          salidas.length > 0
            ? `<table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
                <thead>
                  <tr style="background:#0a3d62;color:#fff;text-align:left;">
                    <th>No.</th><th>Fecha</th><th>Usuario</th><th>Código</th><th>Cantidad</th><th>Motivo</th>
                  </tr>
                </thead>
                <tbody>${filasSalidas}</tbody>
              </table>`
            : "<p>No hubo salidas registradas esta semana.</p>"
        }
        <p style="margin-top:20px;font-size:12px;color:#5c6b78;">Adjunto va el reporte completo en PDF.</p>
      </div>
    </div>
  `;
}

// ============================================================
// PDF con membrete: banda navy arriba con el logo GUS + título, y una
// tabla con encabezado navy y filas alternadas debajo. Usa pdf-lib
// (funciona en una función serverless de Vercel sin navegador headless).
// ============================================================
export async function construirPDF({ salidas, tanques }, { desde, hasta, tipo }) {
  const filas = filasReporte({ salidas, tanques });
  const { col1, col2 } = columnasDinamicas(tipo);
  const titulo = tituloReporte(tipo);

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
  const ROW_H = 20;
  const HEADER_ROW_H = 22;
  const COLS = [
    { key: "codigoTipo", label: col1, w: 140, align: "left" },
    { key: "cantidad", label: "Cantidad", w: 58, align: "right" },
    { key: "motivoGas", label: col2, w: 90, align: "left" },
    { key: "usuario", label: "Usuario", w: 120, align: "left" },
    { key: "fecha", label: "Fecha", w: 74, align: "left" },
    { key: "folio", label: "No.", w: 0, align: "left" }, // ancho restante
  ];
  const tableW = PAGE_W - MARGIN * 2;
  const usedW = COLS.reduce((acc, c) => acc + c.w, 0);
  COLS[COLS.length - 1].w = tableW - usedW;

  // Arreglo del encimado logo/título: el logo ya no fuerza un ancho fijo
  // de texto — el texto arranca a un gap fijo DESPUÉS del ancho real del
  // logo (con un tope máximo para que un logo muy ancho no empuje el
  // título fuera de la banda), en vez de asumir que el logo siempre cabe
  // en 60pt como antes (eso era lo que causaba el encimado).
  const LOGO_H = 32;
  const LOGO_MAX_W = 90;
  const TEXTO_GAP = 14;
  let logoW = 0;
  if (logoImg) {
    logoW = Math.min((logoImg.width / logoImg.height) * LOGO_H, LOGO_MAX_W);
  }
  const textoX = MARGIN + (logoImg ? logoW + TEXTO_GAP : 0);
  const textoMaxW = PAGE_W - MARGIN - textoX;

  function nuevaPagina() {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

    // Banda navy con logo + título
    page.drawRectangle({ x: 0, y: PAGE_H - BAND_H, width: PAGE_W, height: BAND_H, color: rgb(NAVY.r, NAVY.g, NAVY.b) });

    if (logoImg) {
      page.drawImage(logoImg, {
        x: MARGIN,
        y: PAGE_H - BAND_H / 2 - LOGO_H / 2,
        width: logoW,
        height: LOGO_H,
      });
    }

    page.drawText(truncar(titulo, textoMaxW + 12, fontBold, 16), {
      x: textoX,
      y: PAGE_H - 30,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`${desde} a ${hasta}`, {
      x: textoX,
      y: PAGE_H - 48,
      size: 10,
      font: fontRegular,
      color: rgb(0.85, 0.9, 0.95),
    });

    return page;
  }

  function dibujarEncabezadoTabla(page, y) {
    page.drawRectangle({
      x: MARGIN,
      y: y - HEADER_ROW_H,
      width: tableW,
      height: HEADER_ROW_H,
      color: rgb(NAVY.r, NAVY.g, NAVY.b),
    });
    let x = MARGIN;
    for (const col of COLS) {
      page.drawText(col.label, {
        x: x + 6,
        y: y - HEADER_ROW_H + 7,
        size: 9,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
      x += col.w;
    }
    return y - HEADER_ROW_H;
  }

  let page = nuevaPagina();
  let y = PAGE_H - BAND_H - 24;
  y = dibujarEncabezadoTabla(page, y);

  if (filas.length === 0) {
    page.drawText("Sin datos en el rango elegido.", {
      x: MARGIN + 6,
      y: y - 18,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  filas.forEach((f, i) => {
    if (y - ROW_H < MARGIN) {
      page = nuevaPagina();
      y = PAGE_H - BAND_H - 24;
      y = dibujarEncabezadoTabla(page, y);
    }

    if (i % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - ROW_H,
        width: tableW,
        height: ROW_H,
        color: rgb(0.96, 0.97, 0.98),
      });
    }

    let x = MARGIN;
    const valores = {
      folio: `#${f.folio}`,
      fecha: f.fecha,
      codigoTipo: f.codigoTipo || "",
      usuario: f.usuario || "",
      motivoGas: f.motivoGas || "",
      cantidad: String(f.cantidad),
    };

    for (const col of COLS) {
      const texto = truncar(String(valores[col.key] ?? ""), col.w, fontRegular, 8.5);
      const textW = fontRegular.widthOfTextAtSize(texto, 8.5);
      const tx = col.align === "right" ? x + col.w - textW - 6 : x + 6;
      page.drawText(texto, { x: tx, y: y - ROW_H + 6, size: 8.5, font: fontRegular, color: rgb(0.1, 0.15, 0.2) });
      x += col.w;
    }

    // línea inferior de la fila
    page.drawLine({
      start: { x: MARGIN, y: y - ROW_H },
      end: { x: MARGIN + tableW, y: y - ROW_H },
      thickness: 0.5,
      color: rgb(0.87, 0.9, 0.92),
    });

    y -= ROW_H;
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

function truncar(texto, colWidth, font, size) {
  const maxW = colWidth - 12;
  if (font.widthOfTextAtSize(texto, size) <= maxW) return texto;
  let t = texto;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", size) > maxW) {
    t = t.slice(0, -1);
  }
  return t + "…";
}
