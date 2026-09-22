import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { obtenerDatosReporte, construirPDF, tituloReporte } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// V12: botón "Enviar por correo" dentro del modal "Ver reporte" -- manda
// el PDF de ESE reporte (con los filtros que el usuario eligió). Disponible
// para cualquier usuario con acceso a Reportes, no solo el Titular (a
// diferencia del reporte semanal automático, que sigue siendo solo
// Titular/"correos_semanales").
// V13 (ítem 1 del backlog, 22-sep-2026): antes mandaba siempre al correo de
// quien tiene la sesión abierta -- ahora el modal deja escribir a qué
// correo mandarlo (parámetro `correo`); si no se manda, se usa el correo
// de la sesión como antes. Nota: mientras el dominio no esté verificado en
// Resend, la cuenta solo deja mandar de verdad a la dirección dueña de la
// API key -- cualquier otro destino va a rebotar con el error de sandbox
// de Resend hasta que se resuelva eso (ver backlog ítem 6).
export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);

  if (!user || !tieneAcceso(profile, "reportes")) {
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

  const correoPedido = searchParams.get("correo")?.trim();
  const correoDestino = correoPedido || user.email;

  if (!correoDestino) {
    return NextResponse.json({ error: "Falta un correo de destino." }, { status: 400 });
  }
  if (correoPedido && !EMAIL_REGEX.test(correoPedido)) {
    return NextResponse.json({ error: "Ese correo no es válido." }, { status: 400 });
  }

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
    to: [correoDestino],
    subject: `${tituloReporte(tipo)} — Gus Dive (${desde} a ${hasta})`,
    html: `<p style="font-family:sans-serif;color:#1a2733;">Adjunto va el reporte que generaste en la app, del ${desde} al ${hasta}.</p>`,
    attachments: [
      { filename: `gus-dive-reporte_${desde}_a_${hasta}.pdf`, content: pdfBuffer.toString("base64") },
    ],
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo: correoDestino });
}
