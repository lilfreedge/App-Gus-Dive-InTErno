import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getProfileYUser } from "@/lib/roles";
import { permisosEst, fechaCursoCorta } from "@/lib/estudiantes/modelo";
import { origenDe } from "@/lib/direccion";
import { mandarPresupuesto } from "@/lib/correo-presupuesto";
import { crearTokenEntrega } from "@/lib/entrega-qr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ES_OWD = (n) => /^open water diver$/i.test(String(n || "").trim());

// V88 (maqueta V88, aprobada 16-nov-2026): el presupuesto de cada fecha.
//   { accion: "pedir", fechaId }     -> manda el correo una sola vez (la app lo
//                                       pide al crear la fecha) y lo anota.
//   { accion: "realizado", fechaId } -> se marca a mano cuando ya llegó.
export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  const p = permisosEst(profile);
  if (!user || !(p.estudiantes || p.cursos)) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.fechaId || "");
  if (!id) return NextResponse.json({ error: "Falta la fecha." }, { status: 400 });
  const s = createServiceClient();
  const { data: fr } = await s.from("est_fechas").select("*").eq("id", id).maybeSingle();
  if (!fr) return NextResponse.json({ error: "Esa fecha ya no está." }, { status: 404 });
  const ahora = new Date().toISOString();

  if (body.accion === "realizado") {
    const { error } = await s.from("est_fechas").update({ presupuesto_realizado_en: ahora }).eq("id", id);
    if (error) return NextResponse.json({ error: "No se pudo marcar. Revisa que ya se haya corrido migration_100.sql." }, { status: 500 });
    return NextResponse.json({ ok: true, en: ahora });
  }

  // V91 (maqueta v92, aprobada): el QR que el instructor escanea para confirmar
  // que recibió el presupuesto. Vence a los 15 minutos (lib/entrega-qr.js).
  if (body.accion === "qr") {
    if (!fr.presupuesto_realizado_en) return NextResponse.json({ error: "Primero marca el presupuesto como listo." }, { status: 400 });
    const { data: cursoQr } = await s.from("est_cursos").select("nombre, info").eq("id", fr.curso_id).maybeSingle();
    if (cursoQr?.info?.qr_instructor === false) return NextResponse.json({ error: "Este curso no pide QR al instructor (se apaga en Editar curso)." }, { status: 400 });
    const { token, expiraEn } = crearTokenEntrega(id);
    return NextResponse.json({ ok: true, url: `${origenDe(request)}/confirmar-entrega?t=${token}`, expiraEn });
  }

  if (body.accion !== "pedir") return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
  // V91 (maqueta v92, aprobada): "Pedir otro presupuesto" manda el correo otra vez
  // aunque ya se haya pedido; reinicia "realizado" y "entregado".
  if (fr.presupuesto_pedido_en && !body.otro) return NextResponse.json({ ok: true, ya: true, en: fr.presupuesto_pedido_en });

  const [{ data: curso }, { data: cfg }, { data: ests }] = await Promise.all([
    s.from("est_cursos").select("nombre").eq("id", fr.curso_id).maybeSingle(),
    s.from("app_config").select("presupuesto_correos").maybeSingle(),
    s.from("est_estudiantes").select("buzo_id, estado, fecha_id").eq("curso_id", fr.curso_id).neq("estado", "cancelado"),
  ]);
  const destinos = cfg?.presupuesto_correos || [];
  if (!destinos.length) return NextResponse.json({ error: "Falta el correo del presupuesto: ponlo en Administración › Correos automáticos." }, { status: 400 });

  const inscritosF = (ests || []).filter((e) => e.fecha_id === id && e.estado !== "espera");
  const esperaF = (ests || []).filter((e) => e.estado === "espera");
  const buzoIds = [...new Set([...inscritosF, ...esperaF].map((e) => e.buzo_id).filter(Boolean))];
  const { data: buzos } = buzoIds.length ? await s.from("viajes_buzos").select("id, nombre").in("id", buzoIds) : { data: [] };
  const nombreDe = new Map((buzos || []).map((b) => [b.id, b.nombre]));
  const nombres = (arr) => arr.map((e) => nombreDe.get(e.buzo_id) || "Sin nombre").sort((a, b) => a.localeCompare(b));
  const inscritos = nombres(inscritosF);
  const espera = nombres(esperaF);

  const nombreCurso = curso?.nombre || "Curso";
  const fecha = fechaCursoCorta(fr.inicio);
  const ok = await mandarPresupuesto({
    para: destinos,
    curso: nombreCurso,
    fecha,
    inscritos,
    espera,
    gorras: ES_OWD(nombreCurso) ? inscritos.length : null,
    origen: origenDe(request),
  });
  if (!ok) return NextResponse.json({ error: "No se pudo mandar el correo del presupuesto." }, { status: 502 });

  const reinicio = body.otro ? { presupuesto_realizado_en: null } : {};
  const { error } = await s.from("est_fechas").update({ presupuesto_pedido_en: ahora, ...reinicio }).eq("id", id);
  if (error) return NextResponse.json({ error: "El correo salió, pero no se pudo anotar. Revisa que ya se haya corrido migration_100.sql." }, { status: 500 });
  // Si todavía no se corrió migration_101.sql, esta columna no existe: no pasa nada.
  if (body.otro) await s.from("est_fechas").update({ presupuesto_entregado_en: null, presupuesto_entregado_info: null }).eq("id", id);
  return NextResponse.json({ ok: true, en: ahora, enviados: destinos.length });
}
