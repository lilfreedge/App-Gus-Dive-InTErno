import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { primerNombre, celValido, celGuardar } from "@/lib/viajes/modelo";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";
import { FUENTES } from "@/lib/estudiantes/modelo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- el link de interesados ("Registro de interesado",
// para Instagram o la página web). Lo anota en Interesados como "Nuevo".
// V80 (notas del 13-nov: "No pedir cédula al interesado. Ya no me interesa
// que esté vinculado para cuando se inscriban en registro de estudiante. Que
// pida el contacto") -- antes (V60) pedía la cédula o el pasaporte y lo ligaba
// con su perfil de buzo; ya no. Pide nombre, celular y correo (el correo es
// obligatorio desde la V78: ahí le llega el link del curso).
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  // Trampa para robots: un campo escondido que una persona nunca llena.
  if (body.web) return NextResponse.json({ ok: true });
  const s = createServiceClient();

  const nombre = String(body.nombre || "").trim().slice(0, 120);
  const cel = celGuardar(body.cel);
  const correo = String(body.correo || "").trim().slice(0, 120);
  if (!nombre) return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  if (!celValido(body.cel)) return NextResponse.json({ error: "Escribe tu celular completo." }, { status: 400 });
  if (!correo) return NextResponse.json({ error: "Escribe tu correo." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return NextResponse.json({ error: "Revisa tu correo." }, { status: 400 });
  const curso = String(body.curso || "").slice(0, 80) || null;

  // Si ya dejó sus datos hace poco (mismo celular, todavía abierto), no se repite.
  const abiertos = ["nuevo", "escribimos", "va"];
  const { data: ya } = await s.from("est_interesados").select("id").eq("celular", cel).in("estado", abiertos).limit(1);
  if (ya?.length) {
    // V78: si el registro que ya tenía no traía correo, se le pone el de ahora.
    await s.from("est_interesados").update({ correo }).eq("id", ya[0].id).is("correo", null);
    return NextResponse.json({ ok: true, ya: true, nombre: primerNombre(nombre) });
  }

  // V74: la fuente es la que escogió la persona (¿Cómo te enteraste?); si no
  // escogió nada, se queda "Link".
  const fuente = FUENTES.includes(body.fuente) ? body.fuente : "Link";
  const fila = { nombre, celular: cel, curso, fuente, via: "link" };
  let { error } = await s.from("est_interesados").insert({ ...fila, correo });
  // Sin la migration_86 todavía (no existe la columna del correo): va en la nota.
  if (error && /correo|column/i.test(error.message || "")) ({ error } = await s.from("est_interesados").insert({ ...fila, nota: correo }));
  if (error) return NextResponse.json({ error: "No se pudo enviar. Intenta de nuevo." }, { status: 500 });
  await s.from("est_bitacora").insert({ nombre: "Link", texto: `Dejó sus datos en el link de interesados: ${nombre}${curso ? ` (${curso})` : ""}` });
  await avisarEquipoEst(s, { permiso: "interesados", titulo: "Interesado nuevo", texto: `${nombre}${curso ? ` · ${curso}` : ""}`, url: "/control-estudiantes/interesados" });
  return NextResponse.json({ ok: true, nombre: primerNombre(nombre) });
}
