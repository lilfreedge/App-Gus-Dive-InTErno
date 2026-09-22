import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { tieneAcceso } from "@/lib/roles";
import { obtenerEnviosConfigurados, enviarReportesConfigurados } from "@/lib/reportes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  // Verifica que quien llama tenga permiso, usando el cliente con la
  // sesión del navegador (cookies), no el de servicio. V12: ya no es
  // exclusivo del Titular -- el Titular puede delegar esto a un
  // administrador dándole el permiso "correos_semanales" (ver
  // Administración > Usuarios y permisos).
  const supabaseSesion = createClient();
  const {
    data: { user },
  } = await supabaseSesion.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: profile } = await supabaseSesion
    .from("profiles")
    .select("es_titular, permisos")
    .eq("id", user.id)
    .single();

  if (!tieneAcceso(profile, "correos_semanales")) {
    return NextResponse.json({ error: "No tienes permiso para enviar los reportes semanales" }, { status: 403 });
  }

  // A partir de aquí, misma lógica que el cron semanal
  // (app/api/cron/reporte-semanal/route.js), con el cliente de servicio
  // porque necesita leer/enviar datos de todos los usuarios.
  const supabase = createServiceClient();

  const { data: config } = await supabase.from("app_config").select("reporte_configs").maybeSingle();
  let envios = obtenerEnviosConfigurados(config);

  if (envios.length === 0) {
    return NextResponse.json(
      { error: "Falta configurar destinatarios (Reportes > Reporte semanal por correo, o REPORT_EMAIL_TO)" },
      { status: 500 }
    );
  }

  // Ítem 2 del backlog (22-sep-2026): "Enviar solo esto ahora" en cada
  // tarjeta de envío -- mismo endpoint, pero limitado a un solo envío por
  // su índice dentro de la lista guardada (mismo orden que se ve en
  // pantalla, ver reporte-correo-client.js).
  const { searchParams } = new URL(request.url);
  const indiceParam = searchParams.get("indice");
  if (indiceParam !== null) {
    const indice = Number(indiceParam);
    if (!Number.isInteger(indice) || indice < 0 || indice >= envios.length) {
      return NextResponse.json({ error: "Ese envío ya no existe -- recarga la página." }, { status: 400 });
    }
    envios = [envios[indice]];
  }

  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const desdeStr = desde.toISOString().slice(0, 10);
  const hastaStr = hasta.toISOString().slice(0, 10);

  const { resultados, errores } = await enviarReportesConfigurados(supabase, envios, {
    asunto: "Reporte instantáneo Gus Dive",
    desde: desdeStr,
    hasta: hastaStr,
  });

  if (resultados.length === 0) {
    return NextResponse.json(
      { error: errores.join(" · ") || "No hay secciones marcadas para enviar en ningún envío." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    enviados: resultados.length,
    destinatarios: resultados.reduce((acc, r) => acc + r.destinatarios, 0),
    ...(errores.length > 0 ? { advertencia: `Algunos envíos fallaron: ${errores.join(" · ")}` } : {}),
  });
}
