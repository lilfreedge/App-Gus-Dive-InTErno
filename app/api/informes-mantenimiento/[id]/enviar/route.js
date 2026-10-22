import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { enviarReporteOrdenPorCorreo } from "@/lib/reportes-clientes";
import {
  construirPDFInformeMantenimiento,
  htmlInformeMantenimiento,
  textoInformeMantenimiento,
} from "@/lib/informe-documento";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// "Enviar por correo" el Informe de mantenimiento (item 36) -- mismo
// patrón que app/api/reportes-clientes/[id]/enviar/route.js.
//
// V32 (pedido explícito, maqueta aprobada): el correo ya no manda la tabla
// Campo/Valor. El cliente ve el informe DENTRO del correo con el mismo
// diseño del app, y además le llega el PDF adjunto (hoja carta) con ese
// mismo diseño. Ver lib/informe-documento.js.
export async function POST(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "equipos_clientes_informe_mantenimiento")) {
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
    return NextResponse.json({ error: "El informe de mantenimiento solo está disponible para Reguladores" }, { status: 400 });
  }
  if (!o.informe_mantenimiento) {
    return NextResponse.json({ error: "Todavía no se ha generado el informe de esta orden." }, { status: 400 });
  }

  const informe = o.informe_mantenimiento;
  const numero = o.no_orden_fisico ?? o.folio;
  // El logo del correo se toma de la misma dirección del app (los correos
  // no muestran imágenes incrustadas).
  const logoUrl = `${new URL(request.url).origin}/logo-gus-icon.png`;

  let pdfBuffer;
  try {
    pdfBuffer = await construirPDFInformeMantenimiento(o, informe);
  } catch (e) {
    return NextResponse.json({ error: "No se pudo armar el PDF: " + (e?.message || "error") }, { status: 500 });
  }

  const { error } = await enviarReporteOrdenPorCorreo({
    correoDestino: correo,
    tituloCorreo: `Informe de mantenimiento — Orden #${numero} — Gus Dive`,
    pdfBuffer,
    nombreArchivo: `informe-mantenimiento-${numero}.pdf`,
    html: htmlInformeMantenimiento(o, informe, { logoUrl }),
    texto: textoInformeMantenimiento(o, informe),
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo });
}
