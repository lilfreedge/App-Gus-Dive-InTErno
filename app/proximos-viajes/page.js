import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje } from "@/lib/viajes/datos";
import { estadoViaje, fechaObj, hoyISO, DIAS, MESES, rd, us } from "@/lib/viajes/modelo";
import AltoIframe from "@/components/viajes/AltoIframe";

export const dynamic = "force-dynamic";
export const metadata = { title: "Próximos buceos · Gus Dive Center" };

// V42 -- Recuadro "Próximos viajes" para la página web (gusdivecenter.com).
// Se pone UNA vez en WordPress (bloque "HTML personalizado"):
//   <iframe id="gus-viajes" src="https://app-gus-dive-in-t-erno.vercel.app/proximos-viajes"
//     style="width:100%;border:0;min-height:400px" loading="lazy" title="Próximos viajes"></iframe>
//   <script>window.addEventListener("message",function(e){if(e.data&&e.data.tipo==="gus-viajes-alto")
//     {document.getElementById("gus-viajes").style.height=e.data.alto+"px";}});</script>
// y de ahí en adelante sale solo cada viaje con "Mostrar en gusdivecenter.com"
// (el script de abajo hace que el recuadro se ajuste solo a su alto).
export default async function ProximosViajesPage() {
  const s = createServiceClient();
  const { data } = await s.from("viajes").select("*").eq("web", true).gte("fecha", hoyISO()).order("fecha");
  const viajes = (data || []).map(filaAViaje).filter((v) => ["abierto", "cerrado_insc"].includes(estadoViaje(v)));
  const ids = viajes.map((v) => v.id);
  const { data: ins } = ids.length
    ? await s.from("viajes_inscripciones").select("viaje_id").in("viaje_id", ids).eq("estado", "inscrito").neq("rol", "staff")
    : { data: [] };
  const porMes = {};
  for (const v of viajes) {
    const k = v.fecha.slice(0, 7);
    (porMes[k] = porMes[k] || []).push(v);
  }
  return (
    <div className="wp-embed wp-embed-real">
      <style>{`body{background:#fff !important}`}</style>
      <AltoIframe />
      <div className="wp-embed-t">Próximos buceos</div>
      {Object.entries(porMes).map(([k, vs]) => (
        <div key={k}>
          <div className="wp-mes">{MESES[Number(k.slice(5)) - 1].toUpperCase()}</div>
          {vs.map((v) => {
            const n = (ins || []).filter((x) => x.viaje_id === v.id).length;
            const quedan = Math.max(0, (v.cupoMax || 0) - n);
            const d = fechaObj(v.fecha);
            const pagan = (v.opciones || []).filter((o) => !o.noPaga);
            const desde = pagan.length ? (v.moneda === "USD" ? us(Math.min(...pagan.map((o) => o.usd || 0))) : rd(Math.min(...pagan.map((o) => o.dop || 0)))) : "";
            const cerrada = estadoViaje(v) === "cerrado_insc";
            return (
              <div key={v.id} className="wp-viaje">
                <div className="wp-dia">
                  {DIAS[d.getDay()]} {String(d.getDate()).padStart(2, "0")}
                </div>
                <div style={{ flex: 1 }}>
                  <b>{v.nombre}</b>
                  <div className="wp-mini">
                    {desde ? `Desde ${desde} · ` : ""}
                    {cerrada ? "inscripción cerrada" : quedan > 0 ? `quedan ${quedan} cupos` : "lleno (lista de espera)"}
                  </div>
                </div>
                {!cerrada && (
                  <a className="wp-btn" href={`/inscripcion/${v.slug}`} target="_top">
                    Inscribirme
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ))}
      {viajes.length === 0 && <div className="wp-mini">Pronto anunciamos los próximos buceos.</div>}
    </div>
  );
}
