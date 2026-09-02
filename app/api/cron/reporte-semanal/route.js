import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/service";
import { obtenerDatosReporte, construirPDF, construirXLSX, construirResumenHTML } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  // Vercel Cron manda este header automáticamente cuando CRON_SECRET está configurado.
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const destinatarios = (process.env.REPORT_EMAIL_TO || "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (destinatarios.length === 0) {
    return NextResponse.json(
      { error: "Falta configurar REPORT_EMAIL_TO" },
      { status: 500 }
    );
  }

  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);

  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  const supabase = createServiceClient();
  const datos = await obtenerDatosReporte(supabase, {
    tipo: "ambos",
    desde: desdeStr,
    hasta: hastaStr,
  });

  // PDF es el reporte