import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { soloDigitos } from "@/lib/viajes/modelo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el link "Me interesa" (para Instagram o la página
// web): deja su nombre, celular y el curso que le interesa, y cae en
// Interesados como "Nuevo".
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // Trampa para robots: un campo escondido que una persona nunca llena.
  if (body.web) return NextResponse.json({ ok: true });
  const nombre = String(body.nombre || "").trim().slice(0, 120);
  const cel = soloDigitos(body.cel);
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (cel.length !== 10) return NextResponse.json({ error: "Escribe tu celular completo (10 números)." }, { status: 400 });
  const s = createServiceClient();
  // Si ya dejó sus datos hace poco con ese celular, no se repite.
  const { data: ya } = await s.from("est_interesados").select("id").eq("celular", cel).in("estado", ["nuevo", "escribimos", "va"]).limit(1);
  if (ya?.length) return NextResponse.json({ ok: true, ya: true });
  const { error } = await s.from("est_interesados").insert({
    nombre,
    celular: cel,
    curso: String(body.curso || "").slice(0, 80) || null,
    cuando: String(body.cuando || "").trim().slice(0, 80) || null,
    fuente: "Link",
    via: "link",
  });
  if (error) return NextResponse.json({ error: "No se pudo enviar. Intenta de nuevo." }, { status: 500 });
  await s.from("est_bitacora").insert({ nombre: "Link", texto: `Dejó sus datos en "Me interesa": ${nombre}${body.curso ? ` (${body.curso})` : ""}` });
  return NextResponse.json({ ok: true });
}
