import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { construirPDFInformeMantenimiento } from "@/lib/informe-documento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PDF del Informe de mantenimiento (item 36). V32: mismo diseño que el
// app, en hoja carta (lib/informe-documento.js) -- el mismo que va
// adjunto en el correo.
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

  const numero = o.no_orden_fisico ?? o.folio;
  const pdfBuffer = await construirPDFInformeMantenimiento(o, o.informe_mantenimiento);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="informe-mantenimiento-${numero}.pdf"`,
    },
  });
}
