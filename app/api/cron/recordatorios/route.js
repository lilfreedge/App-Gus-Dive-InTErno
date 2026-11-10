import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { cargarRecordatorios } from "@/lib/recordatorios";
import { avisarRecordatorio } from "@/lib/recordatorios-avisar";
import { origenDe } from "@/lib/direccion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V63 ("230"): todos los días (vercel.json), a cada persona le llega el
// aviso de sus recordatorios unos días antes ("Avisar X días antes") y el
// día que toca. No se repite: queda anotado en recordatorios_avisos.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const s = createServiceClient();
  const hoy = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const { items, error } = await cargarRecordatorios(s, { hoy, todos: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const origen = origenDe(request);
  let enviados = 0;
  for (const it of items) {
    const r = it.recordatorio;
    if (r.unidad === "horas") {
      // Por horas: avisa cuando ya está cerca o pasó (una vez por fecha).
      if (it.estado !== "pronto" && it.estado !== "vencido") continue;
    } else if (!(it.faltanDias === 0 || (r.avisar_antes > 0 && it.faltanDias === r.avisar_antes))) continue;
    const tipo = r.unidad !== "horas" && it.faltanDias === 0 ? "dia" : "antes";
    const para = it.proxima || hoy;
    const donde = it.compresor ? ` (${it.compresor.codigo})` : it.pendientes ? ` (${it.pendientes} pendiente${it.pendientes === 1 ? "" : "s"})` : "";
    const cuando = r.unidad === "horas" ? it.texto : tipo === "dia" ? "Toca hoy." : `Toca en ${it.faltanDias} día${it.faltanDias === 1 ? "" : "s"}.`;
    for (const userId of r.usuario_ids || []) {
      const res = await avisarRecordatorio(s, { recordatorio: r, compresorId: it.compresor?.id || null, para, tipo, userId, titulo: `${tipo === "dia" ? "Hoy toca" : "Recordatorio"}: ${r.titulo}${donde}`, texto: cuando, origen });
      if (!res.repetido) enviados += 1;
    }
  }
  return NextResponse.json({ ok: true, revisados: items.length, enviados });
}
