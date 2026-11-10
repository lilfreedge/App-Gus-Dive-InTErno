import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { avisarRecordatorio } from "@/lib/recordatorios-avisar";
import { textoCada } from "@/lib/recordatorios";
import { origenDe } from "@/lib/direccion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V63 ("230"): cuando el Titular o un administrador le asigna un
// recordatorio a alguien, a esa persona le llega al momento "Te asignaron…"
// (campanita, celular y correo si se marcó). Solo a la persona asignada.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Entra de nuevo." }, { status: 401 });
  const { data: yo } = await supabase.from("profiles").select("id, full_name, es_titular, is_admin").eq("id", user.id).maybeSingle();
  if (!yo?.es_titular && !yo?.is_admin) return NextResponse.json({ error: "Solo el Titular y los administradores." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  const { data: r } = await s.from("recordatorios_compresores").select("*").eq("id", String(body.id || "")).maybeSingle();
  if (!r) return NextResponse.json({ error: "Ese recordatorio no existe." }, { status: 404 });
  const nuevos = (Array.isArray(body.usuarios) ? body.usuarios : r.usuario_ids || []).filter((id) => (r.usuario_ids || []).includes(id));
  const origen = origenDe(request);
  const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const quien = String(yo.full_name || "").split(" ")[0] || "Alguien";
  for (const userId of nuevos) {
    if (userId === yo.id) continue;
    await avisarRecordatorio(s, {
      recordatorio: r,
      para: hoy,
      tipo: "asignado",
      userId,
      titulo: `Te asignaron: ${r.titulo}`,
      texto: `${quien} te asignó "${r.titulo}" (${textoCada(r).toLowerCase()}). Te sale en Equipos › Recordatorios y te avisamos unos días antes.`,
      origen,
    });
  }
  return NextResponse.json({ ok: true });
}
