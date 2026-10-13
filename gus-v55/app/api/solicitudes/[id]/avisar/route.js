import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso } from "@/lib/roles";
import { enviarAvisoSolicitud } from "@/lib/solicitudes-correo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Manda (o reintenta) el correo al almacén de una solicitud (V29, ver
// lib/solicitudes-correo.js). Lo llama el formulario justo después de
// crear la solicitud, y el botón "Reintentar aviso" de la lista. Todo con
// la sesión de quien lo pide: las políticas de migration_52.sql deciden
// qué puede ver/actualizar.
export async function POST(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("es_titular, permisos").eq("id", user.id).single();
  if (!tieneAcceso(profile, "solicitudes_almacen")) {
    return NextResponse.json({ error: "No tienes permiso para solicitar códigos al almacén." }, { status: 403 });
  }

  const [{ data: solicitud }, { data: config }] = await Promise.all([
    supabase.from("solicitudes_almacen").select("*, items:solicitudes_almacen_items(*)").eq("id", params.id).maybeSingle(),
    supabase.from("app_config").select("solicitudes_correos").maybeSingle(),
  ]);
  if (!solicitud) return NextResponse.json({ error: "Esa solicitud no existe." }, { status: 404 });

  const resultado = await enviarAvisoSolicitud({
    solicitud,
    destinatarios: config?.solicitudes_correos || [],
    responderA: user.email,
  });

  await supabase
    .from("solicitudes_almacen")
    .update(
      resultado.ok
        ? { aviso_enviado_at: new Date().toISOString(), aviso_error: null }
        : { aviso_error: resultado.error }
    )
    .eq("id", solicitud.id);

  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 502 });
}
