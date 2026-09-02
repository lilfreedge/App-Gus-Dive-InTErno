import * as XLSX from "xlsx";

// Trae las salidas y/o llenados de tanques dentro de un rango de fechas.
// `supabase` puede ser el cliente normal (con sesión) o el de servicio (sin sesión, para el cron).
export async function obtenerDatosReporte(supabase, { tipo, desde, hasta }) {
  const desdeISO = new Date(desde).toISOString();
  // "hasta" incluye todo ese día
  const hastaDate = new Date(hasta);
  hastaDate.setHours(23, 59, 59, 999);
  const hastaISO = hastaDate.toISOString();

  const salidas =
    tipo === "tanques"
      ? []
      : (
          await supabase
            .from("salidas_con_nombre")
            .select("*")
            .gte("created_at", desdeISO)
            .lte("created_at", hastaISO)
            .order("created_at", { ascending: true })
        ).data || [];

  const tanques =
    tipo === "salidas"
      ? []
      : (
          await supabase
            .from("llenados_con_nombre")
            .select("*")
            .gte("created_at", desdeISO)
            .lte("created_at", hastaISO)
            .order("created_at", { ascending: true })
        ).data || [];

  return { salidas, tanques };
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function construirXLSX({ salidas, tanques }) {
  const wb = XLSX.utils.book_new();

  if (salidas.length > 0) {
    const filas = salidas.map((s) => ({
      Fecha: formatFecha(s.created_at),
      Empleado: s.full_name,
      Artículo: s.articulo,
      Cantidad: s.cantidad,
      Motivo: s.motivo,
      "Autorizó": s.autorizado_por || "",
      Nota: s.nota || "",
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, hoja, "Salidas");
  }

  if (tanques.length > 0) {
    const filas = tanques.map((t) => ({
      Fecha: formatFecha(t.created_at),
      Empleado: t.full_name,
      Cantidad: t.cantidad,
      Nota: t.nota || "",
    }));
    const hoja = XLSX.utils.json_to_sheet(filas);
    XLSX.utils.book_append_sheet(wb, hoja, "Tanques");
  }

  if (salidas.length === 0 && tanques.length === 0) {
    const hoja = XLSX.utils.json_to_sheet([{ Aviso: "Sin datos en el rango elegido" }]);
    XLSX.utils.book_append_sheet(wb, hoja, "Reporte");
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function construirCSV({ salidas, tanques }) {
  const filas = [
    ["Fecha", "Tipo", "Empleado", "Artículo", "Cantidad", "Motivo", "Autorizó", "Nota"],
  ];

  for (const s of salidas) {
    filas.push([
      formatFecha(s.created_at),
      "Salida",
      s.full_name,
      s.articulo,
      s.cantidad,
      s.motivo,
      s.autorizado_por || "",
      s.nota || "",
    ]);
  }

  for (const t of tanques) {
    filas.push([
      formatFecha(t.created_at),
      "Tanque",
      t.full_name,
      "",
      t.cantidad,
      "",
      "",
      t.nota || "",
    ]);
  }

  return filas
    .map((fila) =>
      fila
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

export function construirResumenHTML({ salidas, tanques, desde, hasta }) {
  const totalTanques = tanques.reduce((acc, t) => acc + Number(t.cantidad), 0);

  const filasSalidas = salidas
    .map(
      (s) =>
        `<tr><td>${formatFecha(s.created_at)}</td><td>${s.full_name}</td><td>${s.articulo}</td><td>${s.cantidad}</td><td>${s.motivo}</td></tr>`
    )
    .join("");

  return `
    <div style="font-family: sans-serif; color: #1a2733;">
      <h2 style="color:#0a3d62;">Reporte semanal — Gus Dive</h2>
      <p>Del ${desde} al ${hasta}</p>
      <p><strong>${salidas.length}</strong> salidas registradas · <strong>${totalTanques}</strong> tanques llenados</p>
      ${
        salidas.length > 0
          ? `<table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px;">
              <thead>
                <tr style="background:#eef3f6;text-align:left;">
                  <th>Fecha</th><th>Empleado</th><th>Artículo</th><th>Cant.</th><th>Motivo</th>
                </tr>
              </thead>
              <tbody>${filasSalidas}</tbody>
            </table>`
          : "<p>No hubo salidas registradas esta semana.</p>"
      }
      <p style="margin-top:20px;font-size:12px;color:#5c6b78;">Adjunto va el detalle completo en Excel.</p>
    </div>
  `;
}
