import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { construirPDFOrdenCliente, filasReporteOrdenCliente, enviarReporteOrdenPorCorreo } from "@/lib/reportes-clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// "Enviar por correo" el reporte de una orden (item 15, pedido explícito:
// "si como lo tenemos en app interno" -- mismo patrón que
// app/api/reportes/enviar-a-mi/route.js, adaptado a un solo registro en
// vez de un rango de fechas).
export async function POST(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "equipos_clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const correo = (body.correo || "").trim();
  if (!correo) return NextResponse.json({ error: "Falta un correo de destino." }, { status: 400 });
  if (!EMAIL_REGEX.test(correo)) return NextResponse.json({ error: "Ese correo no es válido." }, { status: 400 });

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  if (o.tipo_equipo !== "Reguladores") {
    return NextResponse.json({ error: "El reporte solo está disponible para Reguladores" }, { status: 400 });
  }

  let serie = null;
  if (o.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", o.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  const filas = filasReporteOrdenCliente(o, { serie });
  const numero = o.no_orden_fisico ?? o.folio;
  const pdfBuffer = await construirPDFOrdenCliente({
    titulo: `Reporte — Orden #${numero}`,
    subtitulo: `${o.cliente_nombre_snapshot || ""}`,
    filas,
  });

  const { error } = await enviarReporteOrdenPorCorreo({
    correoDestino: correo,
    tituloCorreo: `Reporte de orden #${numero} — Gus Dive`,
    pdfBuffer,
    nombreArchivo: `reporte-orden-${numero}.pdf`,
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo });
}
