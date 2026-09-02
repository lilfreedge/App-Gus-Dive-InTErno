import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { obtenerDatosReporte, construirXLSX, construirCSV } from "@/lib/reportes";

export async function GET(request) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "ambos";
  const formato = searchParams.get("formato") || "xlsx";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Falta el rango de fechas" }, { status: 400 });
  }

  const datos = await obtenerDatosReporte(supabase, { tipo, desde, hasta });

  const nombreArchivo = `gus-dive-reporte_${desde}_a_${hasta}`;

  if (formato === "csv") {
    const csv = construirCSV(datos);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivo}.csv"`,
      },
    });
  }

  const buffer = construirXLSX(datos);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.xlsx"`,
    },
  });
}
