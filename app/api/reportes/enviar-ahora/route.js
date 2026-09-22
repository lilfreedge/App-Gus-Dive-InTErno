import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { obtenerDatosReporte, construirPDF, construirXLSX, construirResumenHTML } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  // Verifica que quien llama sea el Titular usando el cliente con la
  // sesión del navegador (cookies), no el de servicio. Mismo patrón que
  // /api/admin/respaldo para mantener consistencia entre rutas.
  const supabaseSesion = createClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabaseSesion
    .from("profiles")
    .select("es_titular")
    .eq("id", user.id)
    .single();

  if (!profile?.es_titular) {
    return NextResponse.json({ error: "Solo el Titular puede enviar el reporte" }, { status: 403 });
  }

  // A partir de aquí, misma lógica que el cron semanal
  // (app/api/cron/reporte-semanal/route.js), con el cliente de servicio
  // porque necesita leer/enviar datos de todos los usuarios.
  const supabase = createServiceClient();

  const { data: config } = await supabase
    .from("app_config")
    .select("reporte_destinatarios, reporte_detalles")
    .maybeSingle();

  const destinatarios =
    config?.reporte_destinatarios?.length > 0
      ? config.reporte_destinatarios
      : (process.env.REPORT_EMAIL_TO || "").split(",").map((c) => c.trim()).filter(Boolean);

  if (destinatarios.length === 0) {
    return NextResponse.json({ error: "Falta configurar los destinatarios (Administración > Reporte semanal, o REPORT_EMAIL_TO)" }, { status: 500 });
  }

  const detalles = config?.reporte_detalles || { salidas: true, llenados: true };
  const incluir = {
    salidas: detalles.salidas !== false,
    llenados: detalles.llenados !== false,
    inspecciones: !!detalles.inspecciones,
    mantenimientos: !!detalles.mantenimientos,
  };

  if (!incluir.salidas && !incluir.llenados && !incluir.inspecciones && !incluir.mantenimientos) {
    return NextResponse.json({ ok: true, info: "No hay secciones marcadas para enviar en el reporte." });
  }

  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  let datos;
  try {
    datos = await obtenerDatosReporte(supabase, { incluir, desde: desdeStr, hasta: hastaStr });
  } catch (err) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }

  const [pdfBuffer, xlsxBuffer] = await Promise.all([
    construirPDF(datos, { desde: desdeStr, hasta: hastaStr, incluir }),
    Promise.resolve(construirXLSX(datos, { desde: desdeStr, hasta: hastaStr, incluir })),
  ]);
  const html = construirResumenHTML({ ...datos, desde: desdeStr, hasta: hastaStr, incluir });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: destinatarios,
    subject: `Reporte instantáneo Gus Dive (${desdeStr} a ${hastaStr})`,
    html,
    attachments: [
      { filename: `gus-dive-reporte_${desdeStr}_a_${hastaStr}.pdf`, content: pdfBuffer.toString("base64") },
      { filename: `gus-dive-reporte_${desdeStr}_a_${hastaStr}.xlsx`, content: xlsxBuffer.toString("base64") },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    destinatarios: destinatarios.length,
    salidas: datos.salidas.length,
    tanques: datos.tanques.length,
    inspecciones: datos.inspecciones.length,
    mantenimientos: datos.mantenimientos.length,
  });
}
