import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { leerTokenEntrega, describirAparato } from "@/lib/entrega-qr";
import { fechaCursoCorta } from "@/lib/estudiantes/modelo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V91 (maqueta v92, aprobada): la página que abre el instructor al escanear el QR.
//   GET  ?t=...  -> lo que se va a confirmar (curso, fecha, si ya venció). No cambia nada.
//   POST {t}     -> confirma que recibió el presupuesto. Sin cuenta ni nombre: solo
//                   queda el modelo del celular, el navegador y la hora.
async function cargarFecha(s, fechaId) {
  const { data: fr } = await s.from("est_fechas").select("*").eq("id", fechaId).maybeSingle();
  if (!fr) return { fr: null, curso: null };
  const { data: curso } = await s.from("est_cursos").select("nombre").eq("id", fr.curso_id).maybeSingle();
  return { fr, curso };
}

export async function GET(request) {
  const r = leerTokenEntrega(new URL(request.url).searchParams.get("t"));
  if (r.error === "invalido") return NextResponse.json({ error: "invalido" }, { status: 400 });
  const s = createServiceClient();
  const { fr, curso } = await cargarFecha(s, r.fechaId);
  if (!fr) return NextResponse.json({ error: "invalido" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    vencido: r.error === "vencido",
    curso: curso?.nombre || "Curso",
    fecha: fechaCursoCorta(fr.inicio),
    listo: !!fr.presupuesto_realizado_en,
    yaConfirmado: fr.presupuesto_entregado_en ? fechaCursoCorta(String(fr.presupuesto_entregado_en).slice(0, 10)) : null,
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const r = leerTokenEntrega(body.t);
  if (r.error === "invalido") return NextResponse.json({ error: "invalido" }, { status: 400 });
  if (r.error === "vencido") return NextResponse.json({ error: "vencido" }, { status: 410 });
  const s = createServiceClient();
  const { fr, curso } = await cargarFecha(s, r.fechaId);
  if (!fr) return NextResponse.json({ error: "invalido" }, { status: 404 });
  if (fr.presupuesto_entregado_en) return NextResponse.json({ ok: true, ya: true, en: fr.presupuesto_entregado_en });
  if (!fr.presupuesto_realizado_en) return NextResponse.json({ error: "listo" }, { status: 409 });

  // Sin cuenta ni nombre (respuestas 7 y 25): solo el aparato y la hora.
  const info = describirAparato(request.headers.get("user-agent"));
  const ahora = new Date().toISOString();
  const { error } = await s.from("est_fechas").update({ presupuesto_entregado_en: ahora, presupuesto_entregado_info: info }).eq("id", fr.id);
  if (error) return NextResponse.json({ error: "No se pudo anotar. Revisa que ya se haya corrido migration_101.sql." }, { status: 500 });
  return NextResponse.json({ ok: true, en: ahora, curso: curso?.nombre || "Curso", fecha: fechaCursoCorta(fr.inicio) });
}
