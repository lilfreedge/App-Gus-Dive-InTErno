import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { llavesPush } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V44 -- Notificaciones en el celular (migration_72.sql). Cada quien las
// activa en su propio teléfono (el navegador pide permiso a la persona);
// qué avisos le llegan lo decide el Titular en ⚙ › Administración.
//   GET    -> la llave pública para suscribirse
//   POST   -> guarda este celular   { suscripcion, dispositivo }
//   DELETE -> lo quita              { endpoint }

async function quien() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("es_titular, permisos").eq("id", user.id).maybeSingle();
  if (!p || !(p.es_titular || p.permisos?.acceso_viajes)) return null;
  return user;
}

export async function GET() {
  const user = await quien();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const s = createServiceClient();
  const k = await llavesPush(s);
  const { data } = await s.from("viajes_push").select("endpoint, dispositivo, creado_en").eq("user_id", user.id);
  return NextResponse.json({ publica: k.publica, mios: data || [] });
}

export async function POST(request) {
  const user = await quien();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sub = body.suscripcion || {};
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !/^https:\/\//.test(sub.endpoint)) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  const s = createServiceClient();
  // Si ese mismo navegador estaba con otra persona, pasa a esta.
  await s.from("viajes_push").delete().eq("endpoint", sub.endpoint);
  const { error } = await s.from("viajes_push").insert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    dispositivo: String(body.dispositivo || "").slice(0, 80),
  });
  if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const user = await quien();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  await s.from("viajes_push").delete().eq("user_id", user.id).eq("endpoint", String(body.endpoint || ""));
  return NextResponse.json({ ok: true });
}
