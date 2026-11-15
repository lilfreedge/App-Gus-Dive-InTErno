import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { estadoViaje, hoyISO } from "@/lib/viajes/modelo";
import { fechasProximas } from "@/lib/estudiantes/fechas-servidor";
import AppGus from "@/components/AppGus";

export const dynamic = "force-dynamic";
// V81 -- "App Gus" (maqueta V82 aprobada): la app de los clientes.
export const metadata = {
  title: "App Gus · Gus Dive Center",
  manifest: "/app-gus.webmanifest",
  icons: { apple: "/icono-app-192.png" },
  appleWebApp: { capable: true, title: "App Gus", statusBarStyle: "default" },
};

// Lo que se ve sin entrar: los próximos cursos (los que salen en el link del
// estudiante) y los próximos buceos (los marcados para salir en la página
// web, como el recuadro de gusdivecenter.com).
export default async function AppGusPage() {
  const s = createServiceClient();
  const { data: cs } = await s.from("est_cursos").select("id, nombre, en_link").eq("activo", true).order("orden").order("nombre");
  const cursosLink = (cs || []).filter((c) => c.en_link !== false);
  const { conFechas, porCurso } = await fechasProximas(s, cursosLink.map((c) => c.id));
  const cursos = conFechas
    ? cursosLink
        .flatMap((c) => (porCurso[c.id] || []).map((f) => ({ fechaId: f.id, curso: c.nombre, inicio: f.inicio, quedan: f.quedan })))
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .slice(0, 8)
    : [];
  const { data: vs } = await s.from("viajes").select("*").eq("web", true).gte("fecha", hoyISO()).order("fecha");
  const viajes = (vs || []).map(filaAViaje).filter((v) => ["abierto", "cerrado_insc"].includes(estadoViaje(v)));
  const ids = viajes.map((v) => v.id);
  const { data: ins } = ids.length ? await s.from("viajes_inscripciones").select("viaje_id").in("viaje_id", ids).eq("estado", "inscrito").neq("rol", "staff") : { data: [] };
  const buceos = viajes.slice(0, 8).map((v) => ({
    slug: v.slug,
    nombre: v.nombre,
    fecha: v.fecha,
    salida: v.salida || "",
    quedan: estadoViaje(v) === "cerrado_insc" ? 0 : Math.max(0, (v.cupoMax || 0) - (ins || []).filter((x) => x.viaje_id === v.id).length),
  }));
  return <AppGus cursos={cursos} buceos={buceos} />;
}
