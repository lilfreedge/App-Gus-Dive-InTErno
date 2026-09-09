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
  let datos;
  try {
    datos = await obtenerDatosReporte(supabase, {
      tipo: "ambos",
      desde: desdeStr,
      hasta: hastaStr,
    });
  } catch (err) {
    // Antes, un error de Supabase aquí se tragaba silenciosamente
    // (la consulta fallaba y el reporte salía vacío sin avisar).
    // Ahora se reporta explícitamente en vez de mandar un correo vacío.
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }

  // PDF es el reporte principal (preferencia del dueño); se manda además
  // el Excel como respaldo porque es barato de generar en el mismo paso.
  const [pdfBuffer, xlsxBuffer] = await Promise.all([
    construirPDF(datos, { desde: desdeStr, hasta: hastaStr, tipo: "ambos" }),
    Promise.resolve(construirXLSX(datos, { desde: desdeStr, hasta: hastaStr, tipo: "ambos" })),
  ]);
  const html = construirResumenHTML({ ...datos, desde: desdeStr, hasta: hastaStr });

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: destinatarios,
    subject: `Reporte semanal Gus Dive (${desdeStr} a ${hastaStr})`,
    html,
    attachments: [
      {
        filename: `gus-dive-reporte_${desdeStr}_a_${hastaStr}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
      {
        filename: `gus-dive-reporte_${desdeStr}_a_${hastaStr}.xlsx`,
        content: xlsxBuffer.toString("base64"),
      },
    ],
  });

  if (error) {
    return NextResponse.json(
      { error: error?.message || error?.name || JSON.stringify(error) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, salidas: datos.salidas.length, tanques: datos.tanques.length });
}
