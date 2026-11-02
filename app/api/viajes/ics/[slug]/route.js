import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { textoIcs } from "@/lib/viajes/modelo";
import { encuentroDe } from "@/lib/viajes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V59 (165) -- "Agregar a mi calendario" del link de inscripción: un evento
// con la fecha, la hora de salida y el punto de encuentro. En el iPhone abre
// "Agregar al calendario".
export async function GET(request, { params }) {
  const s = createServiceClient();
  const { data: fila } = await s.from("viajes").select("*").eq("slug", params.slug).maybeSingle();
  if (!fila || fila.estado === "cancelado") return new Response("No encontrado", { status: 404 });
  const v = filaAViaje(fila);
  v.encuentro = await encuentroDe(s, fila, v);
  const link = `${new URL(request.url).origin}/inscripcion/${v.slug}`;
  return new Response(textoIcs(v, link), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${String(v.slug || "buceo").replace(/[^a-z0-9-]/gi, "")}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
