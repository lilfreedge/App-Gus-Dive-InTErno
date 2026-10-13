import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerDatosReporte, construirVistaPrevia } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V12: alimenta el modal "Ver reporte" (app/reportes/form-client.js) --
// mismos filtros que /api/reportes/export, pero devuelve JSON en vez de
// un archivo para descargar.
export async function GET(request) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "reportes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo") || "ambos";
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const usuarioId = searchParams.get("usuario_id") || undefined;
  const codigo = searchParams.get("codigo") || undefined;
  const motivo = searchParams.get("motivo") || undefined;
  const tipoGas = searchParams.get("tipo_gas") || undefined;

  if (!desde || !hasta) {
    return NextResponse.json({ error: "Falta el rango de fechas" }, { status: 400 });
  }

  let datos;
  try {
    datos = await obtenerDatosReporte(supabase, {
      tipo,
      desde,
      hasta,
      usuarioId,
      codigo,
      motivo,
      tipoGas,
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }

  const vista = construirVistaPrevia(datos, { desde, hasta, tipo });
  return NextResponse.json(vista);
}
