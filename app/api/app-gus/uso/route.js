import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V85 (nota del 15-nov: "algo para yo poder ver todos los buzos que
// interactúan con el app Gus Dive. Solo yo tendré acceso a esto") -- la
// lista de quién ha entrado al app de los clientes con su cédula. Solo el
// Titular. migration_99.sql.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("es_titular").eq("id", user.id).maybeSingle();
  if (!p?.es_titular) return NextResponse.json({ error: "Solo el Titular." }, { status: 403 });

  const s = createServiceClient();
  const { data: uso, error } = await s.from("gus_uso").select("*").order("ultima_vez", { ascending: false }).limit(1000);
  if (error) return NextResponse.json({ falta: true, personas: [], celularesConAvisos: 0 });
  const ids = (uso || []).map((u) => u.buzo_id);
  const { data: bs } = ids.length ? await s.from("viajes_buzos").select("id, nombre, celular").in("id", ids) : { data: [] };
  const porId = Object.fromEntries((bs || []).map((b) => [b.id, b]));
  const { count } = await s.from("gus_push").select("id", { count: "exact", head: true });
  return NextResponse.json({
    personas: (uso || [])
      .filter((u) => porId[u.buzo_id])
      .map((u) => ({ id: u.buzo_id, nombre: porId[u.buzo_id].nombre, cel: porId[u.buzo_id].celular || "", primera: u.primera_vez, ultima: u.ultima_vez, veces: u.veces || 1, instalada: !!u.instalada, avisos: !!u.avisos })),
    celularesConAvisos: count || 0,
  });
}
