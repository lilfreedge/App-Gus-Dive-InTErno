import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatFecha, formatFechaDDMMAAAA } from "./format";

const NAVY = { r: 10 / 255, g: 61 / 255, b: 98 / 255 };

// Qué secciones incluir en un reporte. Cualquier combinación es válida
// (por ejemplo, el reporte semanal por correo puede traer solo Salidas +
// Mantenimientos si así se configuró en Administración).
const SECCIONES = [
  { key: "salidas", label: "Salidas" },
  { key: "llenados", label: "Llenados" },
  { key: "inspecciones", label: "Inspecciones visuales" },
  { key: "mantenimientos", label: "Mantenimientos de reguladores" },
];

// Traduce el `tipo` (string, usado por la pantalla Reportes con un solo
// <select>) a un objeto `incluir` de secciones — la forma "real" que usan
// obtenerDatosReporte/construir*. Se mantiene por compatibilidad con el
// export route y con el valor histórico "ambos" (Salidas+Llenados, el
// único combo que existía antes de V5).
export function incluirDeTipo(tipo) {
  switch (tipo) {
    case "salidas":
      return { salidas: true };
    case "llenados":
    case "tanques":
      return { llenados: true };
    case "inspecciones":
      return { inspecciones: true };
    case "mantenimientos":
      return { mantenimientos: true };
    case "todos":
      return { salidas: true, llenados: true, inspecciones: true, mantenimientos: true };
    case "ambos":
    default:
      return { salidas: true, llenados: true };
  }
}

// Trae los datos de las secciones marcadas en `incluir`, dentro de un
// rango de fechas, con filtros opcionales (usuario, código de artículo,
// motivo, tipo de gas — estos tres solo aplican a salidas/llenados).
// `supabase` puede ser el cliente normal (con sesión) o el de servicio
// (sin sesión, para el cron).
export async function obtenerDatosReporte(
  supabase,
  { incluir, tipo, desde, hasta, usuarioId, codigo, motivo, tipoGas }
) {
  const secciones = incluir || incluirDeTipo(tipo);

  const desdeISO = new Date(desde).toISOString();
  // "hasta" incluye todo ese día
  const hastaDate = new Date(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  const hastaISO = hastaDate.toISOString();

  let salidas = [];
  if (secciones.salidas) {
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
  if (secciones.llenados) {
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

  let inspecciones = [];
  if (secciones.inspecciones) {
    let q = supabase
      .from("inspecciones_con_nombre")
      .select("*")
      .gte("created_at", desdeISO)
      .lte("created_at", hastaISO)
      .order("created_at", { ascending: true });
    if (usuarioId) q = q.eq("user_id", usuarioId);
    // No falla el reporte completo si la tabla todavía no existe en un
    // proyecto que no ha corrido migration_06.sql — simplemente esa
    // sección sale vacía.
    const { data, error } = await q;
    if (error && error.code !== "42P01") {
      throw new Error(`Error consultando inspecciones: ${error.message || JSON.stringify(error)}`);
    }
    inspecciones = data || [];
  }

  let mantenimientos = [];
  if (secciones.mantenimientos) {
    let q = supabase
      .from("mantenimientos_con_nombre")
      .select("*")
      .gte("created_at", desdeISO)
      .lte("created_at", hastaISO)
      .order("created_at", { ascending: true });
    if (usuarioId) q = q.eq("user_id", usuarioId);
    const { data, error } = await q;
    if (error && error.code !== "42P01") {
      throw new Error(`Error consultando mantenimientos: ${error.message || JSON.stringify(error)}`);
    }
    mantenimientos = data || [];
  }

  return { salidas, tanques, inspecciones, mantenimientos };
}

// Personas que han registrado al menos un movimiento (de cualquier tipo),
// para el filtro "Usuario" de Reportes (no es la lista fija de
// "Autorizado por").
export async function obtenerUsuariosConMovimientos(supabase) {
  const resultados = await Promise.all(
    ["salidas", "llenados_tanques", "inspecciones_visuales", "mantenimientos_reguladores"].map(
      async (tabla) => {
        const { data, error } = await supabase
          .from(tabla)
          .select("user_id, nombre_usuario_snapshot");
        // Tolera que inspecciones_visuales/mantenimientos_reguladores no
        // existan todavía (migration_06.sql sin correr).
        if (error) return [];
        return data || [];
      }
    )
  );

  const mapa = new Map();
  for (const r of resultados.flat()) {
    if (!mapa.has(r.user_id)) {
      mapa.set(r.user_id, r.nombre_usuario_snapshot || "(sin nombre)");
    }
  }

  return Array.from(mapa.entries())
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// `multiple`: true cuando el reporte combina más de una sección — en ese
// caso se antepone la etiqueta del tipo ("Salida — ", "Inspección — ") a
// la columna Código/Tipo para no confundir folios que se repiten entre
// tablas (cada sección tiene su propia numeración).
function filaComun(item, tabla, multiple) {
  let tipoLabel, codigoTipo, cantidad, detalle;

  if (tabla === "salidas") {
    tipoLabel = "Salida";
    codigoTipo = item.articulo;
    cantidad = item.cantidad;
    detalle = item.motivo;
  } else if (tabla === "llenados_tanques") {
    tipoLabel = "Llenado";
    codigoTipo = "Llenados de tanque";
    cantidad = item.cantidad;
    detalle = item.tipo_gas;
  } else if (tabla === "inspecciones_visuales") {
    tipoLabel = "Inspección";
    codigoTipo = item.tanque_codigo_snapshot || "Tanque";
    cantidad = null;
    detalle = item.resultado;
  } else {
    tipoLabel = "Mantenimiento";
    codigoTipo = item.regulador_codigo_snapshot || "Regulador";
    cantidad = null;
    detalle = (item.detalle || "").slice(0, 60);
  }

  return {
    folio: item.folio,
    fecha: formatFechaDDMMAAAA(item.created_at),
    codigoTipo: multiple ? `${tipoLabel} — ${codigoTipo}` : codigoTipo,
    usuario: item.full_name,
    motivoGas: detalle,
    cantidad,
    _orden: new Date(item.created_at).getTime(),
  };
}

function contarSecciones(datos) {
  return [
    datos.salidas?.length ? 1 : 0,
    datos.tanques?.length ? 1 : 0,
    datos.inspecciones?.length ? 1 : 0,
    datos.mantenimientos?.length ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
}

function filasReporte(datos) {
  const multiple = contarSecciones(datos) > 1;
  return [
    ...(datos.salidas || []).map((s) => filaComun(s, "salidas", multiple)),
    ...(datos.tanques || []).map((t) => filaComun(t, "llenados_tanques", multiple)),
    ...(datos.inspecciones || []).map((i) => filaComun(i, "inspecciones_visuales", multiple)),
    ...(datos.mantenimientos || []).map((m) => filaComun(m, "mantenimientos_reguladores", multiple)),
  ].sort((a, b) => a._orden - b._orden);
}

// El título del reporte y los encabezados de las columnas "Código/Tipo" y
// "Motivo/Gas" cambian según qué secciones se pidieron — con una sola
// sección ya no hace falta la barra "/".
export function tituloReporte(incluirOrTipo) {
  const incluir = typeof incluirOrTipo === "string" ? incluirDeTipo(incluirOrTipo) : incluirOrTipo || {};
  const activas = SECCIONES.filter((s) => incluir[s.key]);

  if (activas.length === 0) return "Reporte";
  if (activas.length === SECCIONES.length) return "Reporte general";
  if (activas.length === 1) return `Reporte de ${activas[0].label.toLowerCase()}`;
  return `Reporte de ${activas.map((s) => s.label.toLowerCase()).join(", ")}`;
}

function columnasDinamicas(incluirOrTipo) {
  const incluir = typeof incluirOrTipo === "string" ? incluirDeTipo(incluirOrTipo) : incluirOrTipo || {};
  const activas = SECCIONES.filter((s) => incluir[s.key]).map((s) => s.key);

  if (activas.length === 1) {
    if (activas[0] === "salidas") return { col1: "Código", col2: "Motivo" };
    if (activas[0] === "llenados") return { col1: "Tipo", col2: "Gas" };
    if (activas[0] === "inspecciones") return { col1: "Tanque", col2: "Resultado" };
    if (activas[0] === "mantenimientos") return { col1: "Regulador", col2: "Detalle" };
  }
  return { col1: "Código/Tipo", col2: "Motivo/Gas/Detalle" };
}

export function construirXLSX(datos, { desde, hasta, tipo, incluir } = {}) {
  const activo = incluir || tipo;
  const wb = XLSX.utils.book_new();
  const filas = filasReporte(datos);
  const { col1, col2 } = columnasDinamicas(activo);

  const encabezado = [col1, "Cantidad", col2, "Usuario", "Fecha", "No."];
  const aoa = [
    ["GUS DIVE CENTER — " + tituloReporte(activo)],
    [desde && hasta ? `Del ${desde} al ${hasta}` : ""],
    [],
    encabezado,
    ...filas.map((f) => [
      f.codigoTipo,
      f.cantidad ?? "—",
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

export function construirCSV(datos, { tipo, incluir } = {}) {
  const activo = incluir || tipo;
  const filas = filasReporte(datos);
  const { col1, col2 } = columnasDinamicas(activo);
  const encabezado = [col1, "Cantidad", col2, "Usuario", "Fecha", "No."];

  const out = [
    encabezado,
    ...filas.map((f) => [
      f.codigoTipo,
      f.cantidad ?? "—",
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

export function construirResumenHTML({ salidas, tanques, inspecciones, mantenimientos, desde, hasta, incluir }) {
  const totalTanques = (tanques || []).reduce((acc, t) => acc + Number(t.cantidad), 0);
  // Qué secciones se pidieron de verdad (Administración > Reporte semanal
  // por correo) -- antes este resumen siempre mencionaba "salidas" y
  // "tanques llenados" aunque esa sección viniera desmarcada, mostrando
  // "0 salidas registradas" como si ese dato importara. Ahora, si no se
  // pasa `incluir`, se asume todo incluido (compatibilidad hacia atrás).
  const secciones = incluir || { salidas: true, llenados: true, inspecciones: true, mantenimientos: true };

  const filasSalidas = (salidas || [])
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

  // Cada parte del resumen solo aparece si esa sección está marcada en
  // Administración -- ya no se muestra "0 salidas registradas" ni
  // "0 tanques llenados" cuando esa sección directamente no se pidió.
  const resumenPartes = [];
  if (secciones.salidas) {
    resumenPartes.push(`<strong>${(salidas || []).length}</strong> salidas registradas`);
  }
  if (secciones.llenados) {
    resumenPartes.push(`<strong>${totalTanques}</strong> tanques llenados`);
  }
  if (secciones.inspecciones && inspecciones && inspecciones.length > 0) {
    resumenPartes.push(`<strong>${inspecciones.length}</strong> inspecciones visuales`);
  }
  if (secciones.mantenimientos && mantenimientos && mantenimientos.length > 0) {
    resumenPartes.push(`<strong>${mantenimientos.length}</strong> mantenimientos de reguladores`);
  }

  return `
    <div style="font-family: sans-serif; color: #1a2733;">
      ${encabezado}
      <div style="padding:16px;">
        <p>${
          resumenPartes.length > 0
            ? resumenPartes.join(" · ")
            : "No hay secciones marcadas para este reporte (revisa Administración &gt; Reporte semanal por correo)."
        }</p>
        ${
          secciones.salidas
            ? (salidas || []).length > 0
              ? `<table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
                <thead>
                  <tr style="background:#0a3d62;color:#fff;text-align:left;">
                    <th>No.</th><th>Fecha</th><th>Usuario</th><th>Código</th><th>Cantidad</th><th>Motivo</th>
                  </tr>
                </thead>
                <tbody>${filasSalidas}</tbody>
              </table>`
              : "<p>No hubo salidas registradas esta semana.</p>"
            : ""
        }
        <p style="margin-top:20px;font-size:12px;color:#5c6b78;">Adjunto va el reporte completo en PDF (incluye todas las secciones marcadas en Administración).</p>
      </div>
    </div>
  `;
}

// ============================================================
// PDF con membrete: banda navy arriba con el logo GUS + título, y una
// tabla con encabezado navy y filas alternadas debajo. Usa pdf-lib
// (funciona en una función serverless de Vercel sin navegador headless).
// ============================================================
export async function construirPDF(datos, { desde, hasta, tipo, incluir } = {}) {
  const activo = incluir || tipo;
  const filas = filasReporte(datos);
  const { col1, col2 } = columnasDinamicas(activo);
  const titulo = tituloReporte(activo);

  // Salidas y Llenados son las únicas secciones con una cantidad numérica
  // real (filaComun deja `cantidad = null` en inspecciones/mantenimientos).
  // Si el reporte no incluye ninguna de las dos, la columna "Cantidad"
  // saldría con "—" en todas las filas — se omite y su ancho se reparte
  // entre las demás columnas.
  const incluirNormalizado = typeof activo === "string" ? incluirDeTipo(activo) : activo || {};
  const incluyeCantidad = !!(incluirNormalizado.salidas || incluirNormalizado.llenados);

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
    { key: "codigoTipo", label: col1, w: 160, align: "left" },
    ...(incluyeCantidad ? [{ key: "cantidad", label: "Cantidad", w: 58, align: "right" }] : []),
    { key: "motivoGas", label: col2, w: incluyeCantidad ? 90 : 148, align: "left" },
    { key: "usuario", label: "Usuario", w: 110, align: "left" },
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
      cantidad: f.cantidad === null || f.cantidad === undefined ? "—" : String(f.cantidad),
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
