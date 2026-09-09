import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerDatosReporte, construirXLSX, construirCSV, construirPDF } from "@/lib/reportes";

export const runtime = "nodejs";

export async function GET(request) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "reportes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "ambos";
  const formato = searchParams.get("formato") || "pdf";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const usuarioId = searchParams.get("usuario_id") || undefined;
  const codigo = searchParams.get("codigo") || undefined;
  const motivo = searchParams.get("motivo") || undefined;
  const tipoGas = searchParams.get("tipo_gas") || undefined;

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Falta el rango de fechas" }, { status: 400 });
  }

  const datos = await obtenerDatosReporte(supabase, {
    tipo,
    desde,
    hasta,
    usuarioId,
    codigo,
    motivo,
    tipoGas,
  });

  const nombreArchivo = `gus-dive-reporte_${desde}_a_${hasta}`;

  if (formato === "csv") {
    const csv = construirCSV(datos, { tipo });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.csv"`,
      },
    });
  }

  if (formato === "xlsx") {
    const buffer = construirXLSX(datos, { desde, hasta, tipo });
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.xlsx"`,
      },
    });
  }

  const pdfBuffer = await construirPDF(datos, { desde, hasta, tipo });
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.pdf"`,
    },
  });
}
