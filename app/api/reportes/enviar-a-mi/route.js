import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerDatosReporte, construirPDF, tituloReporte } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V12: botón "Enviar por correo" dentro del modal "Ver reporte" -- manda
// el PDF de ESE reporte (con los filtros que el usuario eligió) a su
// propio correo. Disponible para cualquier usuario con acceso a
// Reportes, no solo el Titular (a diferencia del reporte semanal
// automático, que sigue siendo solo Titular/"correos_semanales").
export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "reportes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!user.email) {
    return NextResponse.json({ error: "Tu cuenta no tiene un correo asociado." }, { status: 400 });
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

  const pdfBuffer = await construirPDF(datos, { desde, hasta, tipo });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: [user.email],
    subject: `${tituloReporte(tipo)} — Gus Dive (${desde} a ${hasta})`,
    html: `<p style="font-family:sans-serif;color:#1a2733;">Adjunto va el reporte que generaste en la app, del ${desde} al ${hasta}.</p>`,
    attachments: [
      { filename: `gus-dive-reporte_${desde}_a_${hasta}.pdf`, content: pdfBuffer.toString("base64") },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo: user.email });
}
