import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { llavesPush } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V44 -- "Mandarme una de prueba": una notificación a los celulares de la
// persona que la pide, para ver que quedó bien activado.
export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const s = createServiceClient();
  const { data: subs } = await s.from("viajes_push").select("id, endpoint, p256dh, auth").eq("user_id", user.id);
  if (!subs?.length) return NextResponse.json({ error: "Todavía no has activado las notificaciones en ningún celular." }, { status: 400 });
  const k = await llavesPush(s);
  const origen = new URL(request.url).origin;
  webpush.setVapidDetails(origen.startsWith("https:") ? origen : "mailto:avisos@gusdivecenter.com", k.publica, k.privada);
  const carga = JSON.stringify({ title: "Gus Dive · Buceos", body: "Así te van a llegar los avisos de los buceos.", url: "/viajes-buceos", tag: "prueba" });
  let ok = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, carga);
      ok += 1;
    } catch (e) {
      if (e?.statusCode === 404 || e?.statusCode === 410) await s.from("viajes_push").delete().eq("id", sub.id);
    }
  }
  if (!ok) return NextResponse.json({ error: "No se pudo mandar. Vuelve a activar las notificaciones en este celular." }, { status: 400 });
  return NextResponse.json({ ok: true, enviadas: ok });
}
