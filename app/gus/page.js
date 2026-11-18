import { createServiceClient } from "@/lib/supabase/service";
import { infoPublica } from "@/lib/estudiantes/presupuesto";
import { filaAViaje } from "@/lib/viajes/datos";
import { estadoViaje, hoyISO } from "@/lib/viajes/modelo";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";
import { TIENDA } from "@/lib/viajes/servidor";
import { TIPOS } from "@/lib/alquiler/modelo";
import AppGus from "@/components/AppGus";
import { metaClientes, APP_CLIENTES } from "@/lib/metadata-clientes";

export const dynamic = "force-dynamic";
// V81 -- "App Gus" (maqueta V82 aprobada): la app de los clientes. V83: se
// llama "Gus Dive".
// V101: lo que sale al mandar el link por WhatsApp (antes salía la
// descripción del app del personal).
export const metadata = metaClientes("Gus Dive", "Cursos de buceo y buceos con Gus Dive Center: mira las próximas fechas, inscríbete y sigue tu curso desde el celular.", APP_CLIENTES);

// Lo que se ve sin entrar: los próximos cursos (los que salen en el link del
// estudiante) y los próximos buceos (los marcados para salir en la página
// web, como el recuadro de gusdivecenter.com).
// V84 (maqueta V84: "1. sí", "2. a b c"): además el catálogo de cursos (con
// su información y su precio, aunque no tengan fecha), todas las fechas y
// buceos próximos para el calendario, los precios de alquiler (solo para
// ver) y el WhatsApp de la tienda para Contacto.
export default async function AppGusPage() {
  const s = createServiceClient();
  const { data: cs } = await s.from("est_cursos").select("*").eq("activo", true).order("orden").order("nombre");
  // V88 (maqueta V89): el mensaje de arriba de la lista de cursos. V103 ("quitemos esa
  // sección de poner un mensaje para los cursos"): ya no sale ninguno.
  const cursosLink = (cs || []).filter((c) => c.en_link !== false);
  const { conFechas, porCurso } = await fechasProximas(s, cursosLink.map((c) => c.id));
  const cursos = conFechas
    ? cursosLink
        .flatMap((c) => (porCurso[c.id] || []).map((f) => ({ fechaId: f.id, cursoId: c.id, curso: c.nombre, inicio: f.inicio, quedan: f.quedan })))
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .slice(0, 60)
    : [];
  const catalogo = cursosLink.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    grupo: c.grupo || "",
    precio: c.precio == null ? null : Number(c.precio),
    info: c.info && typeof c.info === "object" ? infoPublica(c.info) : null,
    // V87 ("en duración cámbialo y ponlo por días, lunes martes miércoles"):
    // lo que se hace cada día (7 textos de lunes a domingo; puede seguir a la
    // semana siguiente). Sale de los pasos del curso, en el Catálogo.
    semana: Array.isArray(c.semana) ? c.semana : null,
  }));
  const { data: vs } = await s.from("viajes").select("*").eq("web", true).gte("fecha", hoyISO()).order("fecha");
  const viajes = (vs || []).map(filaAViaje).filter((v) => ["abierto", "cerrado_insc"].includes(estadoViaje(v)));
  const ids = viajes.map((v) => v.id);
  const { data: ins } = ids.length ? await s.from("viajes_inscripciones").select("viaje_id").in("viaje_id", ids).eq("estado", "inscrito").neq("rol", "staff") : { data: [] };
  const buceos = viajes.slice(0, 40).map((v) => ({
    slug: v.slug,
    nombre: v.nombre,
    fecha: v.fecha,
    salida: v.salida || "",
    quedan: estadoViaje(v) === "cerrado_insc" ? 0 : Math.max(0, (v.cupoMax || 0) - (ins || []).filter((x) => x.viaje_id === v.id).length),
  }));
  // Si falta la tabla de precios (migration_83), no sale la sección.
  const { data: pr } = await s.from("alq_precios_tipo").select("tipo, precio");
  const alquiler = TIPOS.map((t) => ({ t: t.uno, precio: (pr || []).find((r) => r.tipo === t.p)?.precio })).filter((x) => x.precio != null && Number(x.precio) > 0).map((x) => ({ t: x.t, precio: Number(x.precio) }));
  return <AppGus cursos={cursos} catalogo={catalogo} buceos={buceos} alquiler={alquiler} whatsapp={TIENDA.whatsapp} />;
}
