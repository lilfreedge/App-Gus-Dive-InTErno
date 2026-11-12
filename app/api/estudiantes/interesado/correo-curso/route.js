import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { permisosEst } from "@/lib/estudiantes/modelo";
import { primerNombre } from "@/lib/viajes/modelo";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";
import { origenDe } from "@/lib/direccion";
import { mandarCorreoInteresadoCurso } from "@/lib/correo-interesado-curso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V77 (pedido explícito: "al momento que le llegue ese correo que le llegue
// el URL directo para inscribirse en el curso") -- el botón "Enviar link de
// curso por correo" de la ficha del interesado. Solo recibe el id: el
// correo, el nombre, el curso y el link se sacan aquí, de la base, para que
// este camino no sirva para mandar cualquier link a cualquier dirección.
// El link lleva la primera fecha próxima del curso que todavía tiene cupo
// (/estudiante?curso=<fecha>, V66); si no hay ninguna, va el link normal.
export async function POST(request) {
  const supabase = createClient();
  const { user, profile } = await getProfileYUser(supabase);
  if (!user || !permisosEst(profile).interesados) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "Falta el interesado." }, { status: 400 });

  const { data: x, error } = await supabase.from("est_interesados").select("id, nombre, curso, correo").eq("id", id).maybeSingle();
  if (error || !x) return NextResponse.json({ error: "No se encontró el interesado." }, { status: 404 });
  if (!x.correo) return NextResponse.json({ error: "Este interesado no dejó correo." }, { status: 400 });

  let fecha = null;
  if (x.curso) {
    const { data: cursos } = await supabase.from("est_cursos").select("id").eq("nombre", x.curso).eq("activo", true).limit(1);
    const cursoId = cursos?.[0]?.id;
    if (cursoId) {
      const { porCurso } = await fechasProximas(supabase, [cursoId]);
      fecha = (porCurso[cursoId] || []).find((f) => f.quedan == null || f.quedan > 0) || null;
    }
  }
  const link = `${origenDe(request)}/estudiante${fecha ? `?curso=${fecha.id}` : ""}`;

  const ok = await mandarCorreoInteresadoCurso({ correo: x.correo, nombre: primerNombre(x.nombre), curso: x.curso || "buceo", link });
  if (!ok) return NextResponse.json({ error: "No se pudo mandar el correo." }, { status: 500 });
  return NextResponse.json({ ok: true, conFecha: !!fecha });
}
