import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import { IconTank } from "@/components/icons";
import FormLlenadoOperativo from "./operativo-form";

// Inicio del rol "Operativo" (V30, pedido explícito, punto 7 de las notas
// del 8-oct-2026: "Su única función será registrar llenados. En inicio
// reestructúralo completo y hazlo dedicado para ese rol... Quitale todos
// los botones del menú principal, solo tendrá una ventana"). Es la única
// pantalla que tiene: el formulario de llenado ya abierto, el resumen de
// la semana ("que pueda ver resumen de tanques llenados durante la
// semana. Trabajamos de lunes a sábado") y los llenados de hoy de todos
// ("que tenga acceso a todo").
//
// Las fechas se cuentan en hora de República Dominicana (UTC-4, sin
// horario de verano) -- el servidor está en UTC y, de noche, "hoy" ya
// sería mañana.
const ZONA = "America/Santo_Domingo";
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fechaRD(date) {
  // "aaaa-mm-dd" en hora de RD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(date);
}

function inicioDelDiaRD(ymd) {
  return new Date(`${ymd}T00:00:00-04:00`);
}

function sumarDiasYmd(ymd, dias) {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function etiquetaDia(ymd) {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function horaRD(iso) {
  return new Date(iso).toLocaleTimeString("es-DO", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
}

export default async function InicioOperativo({ profile }) {
  const supabase = createClient();

  const hoy = fechaRD(new Date());
  // Día de la semana de hoy en RD: 0 = domingo ... 6 = sábado. El
  // domingo no se trabaja -- ese día se muestra la semana que acaba de
  // terminar.
  const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay();
  const lunes = sumarDiasYmd(hoy, diaSemana === 0 ? -6 : 1 - diaSemana);
  const diasSemana = DIAS.map((_, i) => sumarDiasYmd(lunes, i));
  const domingo = sumarDiasYmd(lunes, 6);

  const [{ data: semana }, { data: deHoy }] = await Promise.all([
    supabase
      .from("llenados_tanques")
      .select("cantidad, tipo_gas, created_at")
      .gte("created_at", inicioDelDiaRD(lunes).toISOString())
      .lt("created_at", inicioDelDiaRD(sumarDiasYmd(domingo, 1)).toISOString())
      .limit(2000),
    supabase
      .from("llenados_con_nombre")
      .select("*")
      .gte("created_at", inicioDelDiaRD(hoy).toISOString())
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const porDia = new Map(diasSemana.map((d) => [d, 0]));
  let domingoTotal = 0;
  let aire = 0;
  let nitrox = 0;
  for (const l of semana || []) {
    const cant = Number(l.cantidad) || 0;
    const dia = fechaRD(new Date(l.created_at));
    if (porDia.has(dia)) porDia.set(dia, porDia.get(dia) + cant);
    else if (dia === domingo) domingoTotal += cant;
    if ((l.tipo_gas || "Aire") === "Nitrox") nitrox += cant;
    else aire += cant;
  }
  const totalSemana = aire + nitrox;
  const totalHoy = (deHoy || []).reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 20 }}>
        <FormLlenadoOperativo userId={profile.id} nombreUsuario={profile.full_name} />

        <div className="section-title">
          Esta semana
          <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--texto-suave)" }}>
            {etiquetaDia(diasSemana[0])} – {etiquetaDia(diasSemana[5])}
          </span>
        </div>
        <div className="card">
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="stat-value">{totalSemana}</span>
            <span className="stat-label" style={{ marginTop: 0 }}>
              tanque{totalSemana === 1 ? "" : "s"} llenado{totalSemana === 1 ? "" : "s"}
            </span>
            <span className="hint-text" style={{ marginTop: 0, marginLeft: "auto" }}>
              Aire: <b>{aire}</b> · Nitrox: <b>{nitrox}</b>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginTop: 14 }}>
            {diasSemana.map((d, i) => {
              const esHoy = d === hoy;
              const futuro = d > hoy;
              return (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    borderRadius: 10,
                    padding: "8px 2px",
                    background: esHoy ? "var(--azul)" : "var(--superficie-suave)",
                    color: esHoy ? "#fff" : "var(--texto)",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: esHoy ? 0.85 : 0.6 }}>{DIAS[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{futuro ? "–" : porDia.get(d)}</div>
                </div>
              );
            })}
          </div>
          {domingoTotal > 0 && (
            <div className="hint-text" style={{ marginTop: 8 }}>
              Además, {domingoTotal} tanque{domingoTotal === 1 ? "" : "s"} el domingo.
            </div>
          )}
        </div>

        <div className="section-title">
          Llenados de hoy
          <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--texto-suave)" }}>
            {totalHoy} tanque{totalHoy === 1 ? "" : "s"}
          </span>
        </div>
        <div className="card">
          {deHoy && deHoy.length > 0 ? (
            deHoy.map((l) => (
              <div className="list-item" key={l.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <IconTank size={14} /> {l.tipo_gas || "Aire"}
                  </span>
                  <span className="list-item-qty">{l.cantidad} tanque(s)</span>
                </div>
                <div className="list-item-meta">
                  {l.full_name || l.nombre_usuario_snapshot || "—"} · {horaRD(l.created_at)}
                </div>
                {l.nota && <div className="list-item-note">{l.nota}</div>}
              </div>
            ))
          ) : (
            <div className="empty">Todavía no hay llenados hoy.</div>
          )}
        </div>
      </div>
    </div>
  );
}
