import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import { construirPDFOrdenCliente, filasReporteOrdenCliente, filasReciboClienteOrden, enviarReporteOrdenPorCorreo } from "@/lib/reportes-clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

// "Enviar por correo" el Recibo de una orden (item 15, pedido explícito:
// "si como lo tenemos en app interno" -- mismo patrón que
// app/api/reportes/enviar-a-mi/route.js, adaptado a un solo registro en
// vez de un rango de fechas). Ampliado a todo tipo de equipo, con las dos
// vistas (1-oct-2026, ver recibo-client.js) -- `vista` en el body, default
// "simple".
export async function POST(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);

  if (!tieneAcceso(profile, "equipos_clientes")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const correo = (body.correo || "").trim();
  const vista = body.vista === "completo" ? "completo" : "simple";
  if (!correo) return NextResponse.json({ error: "Falta un correo de destino." }, { status: 400 });
  if (!EMAIL_REGEX.test(correo)) return NextResponse.json({ error: "Ese correo no es válido." }, { status: 400 });

  const { data: o } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!o) return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });

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

  const { error } = await enviarReporteOrdenPorCorreo({
    correoDestino: correo,
    tituloCorreo: `Recibo de orden #${numero} — Gus Dive`,
    pdfBuffer,
    nombreArchivo: `recibo-orden-${numero}.pdf`,
  });

  if (error) {
    return NextResponse.json({ error: error?.message || error?.name || JSON.stringify(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo });
}
