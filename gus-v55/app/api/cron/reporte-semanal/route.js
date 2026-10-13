import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { obtenerEnviosConfigurados, enviarReportesConfigurados } from "@/lib/reportes";

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

  const supabase = createServiceClient();

  // V12: reporte_configs es una LISTA de envíos, cada uno con sus propios
  // destinatarios y sus propias secciones (configurable desde Reportes >
  // Reporte semanal por correo). obtenerEnviosConfigurados también cae de
  // vuelta a REPORT_EMAIL_TO si todavía no hay nada configurado.
  const { data: config } = await supabase.from("app_config").select("reporte_configs").maybeSingle();
  const envios = obtenerEnviosConfigurados(config);

  if (envios.length === 0) {
    return NextResponse.json(
      { error: "Falta configurar destinatarios (Reportes > Reporte semanal por correo, o REPORT_EMAIL_TO)" },
      { status: 500 }
    );
  }

  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  const { resultados, errores } = await enviarReportesConfigurados(supabase, envios, {
    asunto: "Reporte semanal Gus Dive",
    desde: desdeStr,
    hasta: hastaStr,
  });

  if (resultados.length === 0) {
    return NextResponse.json(
      { error: errores.join(" · ") || "No hay secciones marcadas para enviar en el reporte semanal." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    enviados: resultados.length,
    destinatarios: resultados.reduce((acc, r) => acc + r.destinatarios, 0),
    ...(errores.length > 0 ? { advertencia: `Algunos envíos fallaron: ${errores.join(" · ")}` } : {}),
  });
}
