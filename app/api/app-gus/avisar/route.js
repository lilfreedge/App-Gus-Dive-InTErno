import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { estadoViaje, hoyISO, fechaObj } from "@/lib/viajes/modelo";
import { origenDe } from "@/lib/direccion";
import { avisarClientes } from "@/lib/app-gus-avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V84 -- Lo llaman Control Estudiantes (al agregar una fecha de un curso) y
// Buceos (al crear o cambiar un buceo). Aquí se decide si de verdad es algo
// nuevo para los clientes: el curso sale en el link y la fecha es de hoy en
// adelante; el buceo está marcado para la página web, abierto y es de hoy en
// adelante. Cada uno se avisa una sola vez (avisarClientes).
//   POST { tipo: "curso" | "viaje", id }
const DIA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const cuando = (iso) => {
  const d = fechaObj(iso);
  return `${DIA[d.getDay()]} ${d.getDate()} de ${MES[d.getMonth()]}`;
};

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  const { data: p } = await supabase.from("profiles").select("es_titular, permisos").eq("id", user.id).maybeSingle();
  if (!p || !(p.es_titular || p.permisos?.acceso_viajes || p.permisos?.acceso_estudiantes)) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  const hoy = hoyISO();
  const origen = origenDe(request);

  if (body.tipo === "curso" && body.id) {
    const { data: f } = await s.from("est_fechas").select("id, curso_id, inicio, activo").eq("id", body.id).maybeSingle();
    if (!f || f.activo === false || f.inicio < hoy) return NextResponse.json({ saltado: "no aplica" });
    const { data: c } = await s.from("est_cursos").select("nombre, activo, en_link").eq("id", f.curso_id).maybeSingle();
    if (!c || c.activo === false || c.en_link === false) return NextResponse.json({ saltado: "no sale en el link" });
    const r = await avisarClientes(s, { clave: `curso:${f.id}`, titulo: "Nuevo curso en Gus Dive", texto: `${c.nombre}: empieza el ${cuando(f.inicio)}.`, url: `/estudiante?curso=${encodeURIComponent(f.id)}` }, origen);
    return NextResponse.json(r);
  }

  if (body.tipo === "viaje" && body.id) {
    const { data: fila } = await s.from("viajes").select("*").eq("id", body.id).maybeSingle();
    if (!fila) return NextResponse.json({ saltado: "no existe" });
    const v = filaAViaje(fila);
    if (!v.web || estadoViaje(v) !== "abierto" || v.fecha < hoy || !v.slug) return NextResponse.json({ saltado: "no aplica" });
    const r = await avisarClientes(s, { clave: `viaje:${v.id}`, titulo: "Nuevo buceo en Gus Dive", texto: `${v.nombre}: ${cuando(v.fecha)}.`, url: `/inscripcion/${v.slug}` }, origen);
    return NextResponse.json(r);
  }

  return NextResponse.json({ error: "Falta qué avisar." }, { status: 400 });
}
