import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { recordatoriosConFecha, sumarDias } from "@/lib/viajes/modelo";
import { tokenCalendario } from "@/lib/viajes/servidor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V42 -- Calendario de Viajes para Google Calendar ("Otros calendarios" ->
// "Desde URL"). Trae los viajes y sus recordatorios. Protegido con el token
// que sale en Viajes > Calendario.
const esc = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const fechaIcs = (iso) => iso.replace(/-/g, "");

export async function GET(request) {
  const t = new URL(request.url).searchParams.get("t");
  if (t !== tokenCalendario()) return new Response("No autorizado", { status: 403 });
  const s = createServiceClient();
  const [{ data: viajes }, { data: recs }, { data: hechos }] = await Promise.all([
    s.from("viajes").select("*").neq("estado", "cancelado"),
    s.from("viajes_recordatorios").select("*"),
    s.from("viajes_hechos").select("clave"),
  ]);
  const db = {
    viajes: (viajes || []).map(filaAViaje),
    generales: (recs || []).filter((r) => r.tipo === "general").map((r) => ({ id: r.id, dias: r.dias, texto: r.texto, para: r.para || [] })),
    libres: (recs || []).filter((r) => r.tipo === "suelto").map((r) => ({ id: r.id, fecha: r.fecha, texto: r.texto, para: r.para || [] })),
    hechos: Object.fromEntries((hechos || []).map((h) => [h.clave, true])),
  };
  const lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gus Dive Center//Viajes//ES", "CALSCALE:GREGORIAN", "X-WR-CALNAME:Buceos Gus Dive", "X-WR-TIMEZONE:America/Santo_Domingo"];
  const ahora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  for (const v of db.viajes) {
    const fin = v.finDeSemana ? sumarDias(v.fecha, 3) : sumarDias(v.fecha, 1);
    lineas.push(
      "BEGIN:VEVENT",
      `UID:viaje-${v.id}@gusdive`,
      `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${fechaIcs(v.fecha)}`,
      `DTEND;VALUE=DATE:${fechaIcs(fin)}`,
      `SUMMARY:${esc(`🤿 ${v.nombre}`)}`,
      `DESCRIPTION:${esc(`Salida: ${v.salida}`)}`,
      "END:VEVENT"
    );
  }
  for (const r of recordatoriosConFecha(db)) {
    if (r.hecho) continue;
    lineas.push(
      "BEGIN:VEVENT",
      `UID:rec-${r.key}@gusdive`,
      `DTSTAMP:${ahora}`,
      `DTSTART;VALUE=DATE:${fechaIcs(r.fecha)}`,
      `DTEND;VALUE=DATE:${fechaIcs(sumarDias(r.fecha, 1))}`,
      `SUMMARY:${esc(`🔔 ${r.texto}`)}`,
      `DESCRIPTION:${esc(r.viaje ? r.viaje.nombre : "Recordatorio")}`,
      "END:VEVENT"
    );
  }
  lineas.push("END:VCALENDAR");
  return new Response(lineas.join("\r\n"), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" } });
}
