import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { construirPDFOrdenCliente } from "@/lib/reportes-clientes";
import { filasInformeMantenimiento } from "@/lib/informe-mantenimiento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// "Descargar PDF" del Informe de mantenimiento (item 36). Mismo formato
// que el resto de los documentos de la app (construirPDFOrdenCliente).
export async function GET(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "equipos_clientes_informe_mantenimiento")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  if (o.tipo_equipo !== "Reguladores") {
    return NextResponse.json({ error: "El informe de mantenimiento solo está disponible para Reguladores" }, { status: 400 });
  }
  if (!o.informe_mantenimiento) {
    return NextResponse.json({ error: "Todavía no se ha generado el informe de esta orden." }, { status: 400 });
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

  const filas = filasInformeMantenimiento(o, o.informe_mantenimiento, { serie });
  const numero = o.no_orden_fisico ?? o.folio;
  const pdfBuffer = await construirPDFOrdenCliente({
    titulo: `Informe de mantenimiento — Orden #${numero}`,
    subtitulo: `${o.cliente_nombre_snapshot || ""}`,
    filas,
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-mantenimiento-${numero}.pdf"`,
    },
  });
}
