import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V44 -- Para ⚙ › Administración (solo el Titular): el correo con que
// entra cada persona y en cuántos celulares activó las notificaciones.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data: yo } = await supabase.from("profiles").select("es_titular").eq("id", user.id).maybeSingle();
  if (!yo?.es_titular) return NextResponse.json({ error: "Solo el Titular." }, { status: 403 });
  const s = createServiceClient();
  const [{ data: lista }, { data: subs }] = await Promise.all([s.auth.admin.listUsers({ perPage: 1000 }), s.from("viajes_push").select("user_id")]);
  const personas = {};
  for (const u of lista?.users || []) personas[u.id] = { correo: u.email || "", celulares: 0 };
  for (const x of subs || []) if (personas[x.user_id]) personas[x.user_id].celulares += 1;
  return NextResponse.json({ personas });
}
