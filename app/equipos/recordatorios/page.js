import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import BotonRecordatorioHecho from "@/components/BotonRecordatorioHecho";
import { requireInterno } from "@/lib/roles";
import { hoyISO } from "@/lib/fechas";
import { cargarRecordatorios, textoCada } from "@/lib/recordatorios";

export const dynamic = "force-dynamic";

// V63 ("230. si", maqueta V61, pestaña 2): una sola sección "Recordatorios"
// en Equipos. Cada recordatorio dice qué hay que hacer, cada cuánto y a quién
// le toca. "Hacerlo" le sale solo a la persona asignada y la lleva directo a
// registrarlo; al registrarlo, el recordatorio se mueve solo a la próxima
// fecha. El Titular y los administradores ven todos y los crean o cambian;
// los demás ven solo los suyos.
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const corta = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return `${DIA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]} ${d} ${MES[m - 1]}`;
};

function hacerloUrl(it) {
  const r = it.recordatorio;
  const cid = it.compresor?.id ? `compresor=${it.compresor.id}` : "";
  if (r.reinicia === "Inspección" || r.reinicia === "Mantenimiento preventivo" || r.reinicia === "Mantenimiento correctivo") return `/equipos/compresores/mantenimiento/nueva${cid ? `?${cid}` : ""}`;
  if (r.reinicia === "Inspección visual") return "/equipos/inspeccion-visual/nueva";
  if (r.reinicia === "Mantenimiento de reguladores") return "/equipos/mantenimiento-reguladores/nueva";
  return null;
}

function chip(it) {
  if (it.recordatorio.unidad === "horas") return it.estado === "sin_datos" ? { t: "Sin horómetro", c: "gris" } : { t: it.faltanHoras < 0 ? "Vencido" : `${it.faltanHoras} h`, c: it.estado === "vencido" ? "rojo" : it.estado === "pronto" ? "naranja" : "gris" };
  if (it.nunca && it.recordatorio.reinicia !== "hecho") return { t: "Nunca hecho", c: "rojo" };
  if (it.faltanDias < 0) return { t: "Vencido", c: "rojo" };
  if (it.faltanDias === 0) return { t: "Hoy", c: "naranja" };
  if (it.faltanDias <= 7) return { t: `En ${it.faltanDias} día${it.faltanDias === 1 ? "" : "s"}`, c: "naranja" };
  return { t: corta(it.proxima).replace(/^\S+ /, ""), c: "gris" };
}

export default async function RecordatoriosPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase);
  const esAdmin = !!profile?.es_titular || !!profile?.is_admin;
  const hoy = hoyISO();
  const [{ items, error }, { data: perfiles }, todosLos] = await Promise.all([
    cargarRecordatorios(supabase, { usuarioId: esAdmin ? null : profile.id, hoy, todos: true }),
    supabase.from("profiles").select("id, full_name"),
    esAdmin ? supabase.from("recordatorios_compresores").select("*").order("created_at") : Promise.resolve({ data: [] }),
  ]);
  const nombre = (id) => (perfiles || []).find((p) => p.id === id)?.full_name?.split(" ")[0] || "—";
  const apagados = (todosLos.data || []).filter((r) => r.activo === false);
  const sinSql = esAdmin && (todosLos.data || []).length > 0 && !("que" in todosLos.data[0]);

  const mios = items.filter((it) => (it.recordatorio.usuario_ids || []).includes(profile.id) && (it.estado === "vencido" || it.estado === "pronto" || it.faltanDias === 0));
  const grupos = [
    { t: "Vencidos", l: items.filter((it) => it.estado === "vencido") },
    { t: "Esta semana", l: items.filter((it) => it.estado !== "vencido" && it.estado !== "sin_datos" && (it.estado === "pronto" || (it.faltanDias != null && it.faltanDias <= 7))) },
    { t: "Próximos", l: items.filter((it) => it.estado === "ok" && !(it.faltanDias != null && it.faltanDias <= 7)) },
    { t: "Sin datos todavía", l: items.filter((it) => it.estado === "sin_datos") },
  ];

  const Fila = ({ it }) => {
    const r = it.recordatorio;
    const c = chip(it);
    const mio = (r.usuario_ids || []).includes(profile.id);
    const url = hacerloUrl(it);
    const donde = it.compresor ? ` · Compresor ${it.compresor.codigo}` : it.pendientes != null && it.pendientes > 0 ? ` (${it.pendientes} pendiente${it.pendientes === 1 ? "" : "s"})` : "";
    const cuando =
      r.unidad === "horas"
        ? it.texto || ""
        : it.nunca && r.reinicia !== "hecho"
          ? "nunca registrado"
          : it.faltanDias < 0
            ? `tocaba el ${corta(it.proxima)}`
            : it.faltanDias === 0
              ? "toca hoy"
              : `el ${corta(it.proxima)}`;
    return (
      <div className={`rec-fila ${c.c}`}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b>
            {r.titulo}
            {donde}
          </b>
          <div className="list-item-meta">
            {textoCada(r)} · le toca a {(r.usuario_ids || []).map(nombre).join(", ") || "nadie"} · {cuando}
          </div>
        </div>
        <div className="rec-der">
          <span className={`rec-chip ${c.c}`}>{c.t}</span>
          {mio && url && (
            <Link href={url} className="btn btn-primary rec-hacer">
              Hacerlo
            </Link>
          )}
          {mio && r.reinicia === "hecho" && <BotonRecordatorioHecho recordatorioId={r.id} compresorId={it.compresor?.id || null} nombre={profile?.full_name || ""} />}
          {esAdmin && (
            <Link href={`/equipos/recordatorios/${r.id}/editar`} className="rec-editar">
              Editar
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Recordatorios" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <h1 className="page-title" style={{ margin: 0 }}>
            Recordatorios
          </h1>
          {esAdmin && (
            <Link href="/equipos/recordatorios/nuevo" className="btn btn-primary" style={{ marginTop: 0, width: "auto", textDecoration: "none" }}>
              + Nuevo
            </Link>
          )}
        </div>
        {/* V68 ("27. ok"): sin la frase debajo del título (grupo 2 de las letras pequeñas). */}
        {sinSql && <div className="aviso-box">Falta correr en Supabase el SQL de la V63 para los recordatorios de tanques, reguladores y otras cosas, y para semanas o meses.</div>}
        {error && <div className="error-box">No se pudieron cargar los recordatorios ({error.message}).</div>}

        {mios.length > 0 && (
          <div className="card rec-mios">
            <div className="section-title" style={{ marginTop: 0 }}>
              Para hacer
            </div>
            {mios.map((it) => (
              <Fila key={`m-${it.recordatorio.id}-${it.compresor?.id || "x"}`} it={it} />
            ))}
          </div>
        )}

        {grupos
          .filter((g) => g.l.length)
          .map((g) => (
            <div key={g.t}>
              <div className="section-title">{g.t}</div>
              <div className="card" style={{ padding: "4px 14px" }}>
                {g.l.map((it) => (
                  <Fila key={`${it.recordatorio.id}-${it.compresor?.id || "x"}`} it={it} />
                ))}
              </div>
            </div>
          ))}
        {!items.length && !error && <div className="card empty">{esAdmin ? "Todavía no hay recordatorios." : "No tienes recordatorios."}</div>}

        {esAdmin && apagados.length > 0 && (
          <>
            <div className="section-title">Apagados</div>
            <div className="card" style={{ padding: "4px 14px" }}>
              {apagados.map((r) => (
                <div key={r.id} className="rec-fila gris" style={{ opacity: 0.6 }}>
                  <div style={{ flex: 1 }}>
                    <b>{r.titulo}</b>
                    <div className="list-item-meta">
                      {textoCada(r)} · le toca a {(r.usuario_ids || []).map(nombre).join(", ") || "nadie"}
                    </div>
                  </div>
                  <Link href={`/equipos/recordatorios/${r.id}/editar`} className="rec-editar">
                    Editar
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
