import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { construirPDFOrdenCliente, filasReporteOrdenCliente, filasReciboClienteOrden } from "@/lib/reportes-clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// "Descargar PDF" del Recibo de una orden (items 5/14, pedido explícito).
// Ampliado a todo tipo de equipo, con las dos vistas (1-oct-2026, ver
// recibo-client.js) -- `?vista=simple|completo` en la URL, default
// "simple" (el Recibo que se le entrega al cliente).
export async function GET(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "equipos_clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const vista = searchParams.get("vista") === "completo" ? "completo" : "simple";

  let serie = null;
  if (o.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", o.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  const filas = vista === "completo" ? filasReporteOrdenCliente(o, { serie }) : filasReciboClienteOrden(o, { serie });
  const numero = o.no_orden_fisico ?? o.folio;
  const pdfBuffer = await construirPDFOrdenCliente({
    titulo: `${vista === "completo" ? "Recibo completo" : "Recibo"} — Orden #${numero}`,
    subtitulo: `${o.cliente_nombre_snapshot || ""}`,
    filas,
  });

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-orden-${numero}.pdf"`,
    },
  });
}
