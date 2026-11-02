import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { estadoViaje } from "@/lib/viajes/modelo";
import { TIENDA, encuentroDe } from "@/lib/viajes/servidor";
import PublicoViaje from "@/components/viajes/Publico";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const s = createServiceClient();
  const { data } = await s.from("viajes").select("nombre").eq("slug", params.slug).maybeSingle();
  return { title: data ? `Inscripción · ${data.nombre} · Gus Dive Center` : "Gus Dive Center" };
}

// V42 -- Link de inscripción de un viaje (público, sin cuenta). Solo se le
// manda al navegador lo que el buzo necesita ver: nada de costos, pagos ni
// datos de otros buzos.
export default async function InscripcionPage({ params }) {
  const s = createServiceClient();
  const { data: fila } = await s.from("viajes").select("*").eq("slug", params.slug).maybeSingle();
  if (!fila) notFound();
  const v = filaAViaje(fila);
  const { count } = await s
    .from("viajes_inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("viaje_id", v.id)
    .eq("estado", "inscrito")
    .neq("rol", "staff");
  const encuentro = await encuentroDe(s, fila, v);
  const publico = {
    slug: v.slug,
    nombre: v.nombre,
    fecha: v.fecha,
    salida: v.salida,
    finDeSemana: !!v.finDeSemana,
    // V59 (165): "¿Llegas directo?" (hora, lugar, ubicación y foto de la entrada).
    encuentro,
    moneda: v.moneda,
    tasa: v.tasa,
    opciones: (v.opciones || []).map(({ costo, ...o }) => o),
    equipo: v.equipo,
    extras: v.extras || [],
    preguntas: v.preguntas || [],
    reserva: v.reserva,
    requisito: v.requisito,
    incluye: v.incluye || "",
    noIncluye: v.noIncluye || "",
    habitaciones: !!v.habitaciones,
    // V59: con la inscripción cerrada sale como lleno (lista de espera).
    quedan: estadoViaje(v) === "cerrado_insc" ? 0 : Math.max(0, (v.cupoMax || 0) - (count || 0)),
    abierto: ["abierto", "cerrado_insc"].includes(estadoViaje(v)),
  };
  return <PublicoViaje v={publico} tienda={TIENDA} />;
}
