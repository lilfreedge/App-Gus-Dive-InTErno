import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { llavesPush } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V84 -- "Avísame de cursos y buceos nuevos" en el app Gus Dive (la de los
// clientes, sin cuenta). migration_98.sql.
//   GET    -> la llave pública para suscribirse
//   POST   -> guarda este celular   { suscripcion }
//   DELETE -> lo quita              { endpoint }
export async function GET() {
  const s = createServiceClient();
  const k = await llavesPush(s);
  return NextResponse.json({ publica: k.publica });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const sub = body.suscripcion || {};
  const ok = (x, n) => typeof x === "string" && x.length > 0 && x.length <= n;
  if (!ok(sub.endpoint, 1000) || !/^https:\/\//.test(sub.endpoint) || !ok(sub.keys?.p256dh, 300) || !ok(sub.keys?.auth, 100)) return NextResponse.json({ error: "Suscripción inválida." }, { status: 400 });
  const s = createServiceClient();
  await s.from("gus_push").delete().eq("endpoint", sub.endpoint);
  const { error } = await s.from("gus_push").insert({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
  if (error) return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.endpoint !== "string" || !body.endpoint) return NextResponse.json({ error: "Falta el celular." }, { status: 400 });
  const s = createServiceClient();
  await s.from("gus_push").delete().eq("endpoint", body.endpoint);
  return NextResponse.json({ ok: true });
}
