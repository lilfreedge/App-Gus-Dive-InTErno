"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { IconBell } from "./icons";
import AvisosFijos from "./AvisosFijos";
import { avisosQueSalen } from "@/lib/avisos-fijos";
import { hoyISO } from "@/lib/fechas";

// V52 -- La campanita de App Interno y de App Equipos de clientes, al lado del
// ⚙ (maqueta-v52.html, "16"; "28. si, pero la campana como ícono"; "29. a
// todos les sale"). Adentro: las notificaciones de esa persona (por ahora,
// "Fulano leyó tu aviso") y los avisos fijos que le tocan hoy. El Titular y
// los administradores tienen ahí "Administrar avisos fijos".
// Si falta migration_77.sql (o la 76), sale igual pero vacía.

const hace = (iso) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
};

// `appsAvisos`: de qué apps salen los avisos fijos (el técnico ve los de los dos).
export default function CampanaNotificaciones({ app, appsAvisos = null, tecnico = false, puedeAdministrar = false, rutaAdmin, rutaTodas }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [lista, setLista] = useState(null);
  const [avisos, setAvisos] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const f = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  async function cargarConteo() {
    const { count, error } = await supabase.from("notificaciones").select("id", { count: "exact", head: true }).eq("app", app).is("leida_en", null);
    if (!error) setNoLeidas(count || 0);
  }

  async function cargar() {
    const { data: u } = await supabase.auth.getUser();
    const yoId = u?.user?.id;
    const [{ data: ns }, { data: avs }, { data: leidos }] = await Promise.all([
      supabase.from("notificaciones").select("*").eq("app", app).order("creado_en", { ascending: false }).limit(12),
      supabase.from("avisos_fijos").select("*").in("app", appsAvisos || [app]).eq("activo", true),
      yoId ? supabase.from("avisos_fijos_leidos").select("aviso_id, ocurrencia").eq("user_id", yoId) : Promise.resolve({ data: [] }),
    ]);
    setLista(ns || []);
    setAvisos(yoId ? avisosQueSalen(avs || [], { hoy: hoyISO(), yoId, tecnico, leidos: leidos || [] }) : []);
  }

  useEffect(() => {
    cargarConteo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  async function abrir() {
    const o = !open;
    setOpen(o);
    if (o) await cargar();
  }

  async function marcarLeidas(ids) {
    if (!ids.length) return;
    const ahora = new Date().toISOString();
    await supabase.from("notificaciones").update({ leida_en: ahora }).in("id", ids);
    setLista((l) => (l || []).map((n) => (ids.includes(n.id) ? { ...n, leida_en: ahora } : n)));
    setNoLeidas((c) => Math.max(0, c - ids.length));
  }

  const sinLeer = (lista || []).filter((n) => !n.leida_en);

  return (
    <div className="gear-wrap" ref={ref}>
      <button className="gear-btn campana-btn" onClick={abrir} aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ""}`}>
        <IconBell size={18} />
        {noLeidas > 0 && <span className="campana-n">{noLeidas > 9 ? "9+" : noLeidas}</span>}
      </button>
      {open && (
        <div className="settings-menu campana-menu">
          <div className="campana-head">
            <b>Notificaciones</b>
            {sinLeer.length > 0 && (
              <button type="button" className="campana-link" onClick={() => marcarLeidas(sinLeer.map((n) => n.id))}>
                Marcar todo leído
              </button>
            )}
          </div>
          <div className="campana-lista">
            {lista === null && <div className="campana-vacio">Cargando…</div>}
            {/* V59 (nota 2-nov): "pon un botón de leído a cada uno para que se
                quite de ahí cuando uno lo lea". Aquí salen solo las que no se
                han leído; las leídas siguen en "Ver todas". */}
            {lista && !sinLeer.length && <div className="campana-vacio">No tienes notificaciones nuevas.</div>}
            {sinLeer.map((n) => (
              <div key={n.id} className="campana-fila">
                <a href={n.url || "#"} className="campana-item nuevo" onClick={() => marcarLeidas([n.id])}>
                  <span className="campana-dot" />
                  <span style={{ minWidth: 0 }}>
                    <b>{n.titulo}</b>
                    {n.texto && <span className="campana-txt">{n.texto}</span>}
                    <small>{hace(n.creado_en)}</small>
                  </span>
                </a>
                <button type="button" className="campana-leido" onClick={() => marcarLeidas([n.id])} aria-label="Marcar como leído">
                  Leído
                </button>
              </div>
            ))}
          </div>
          {(avisos.length > 0 || puedeAdministrar) && (
            <>
              <div className="campana-sec">AVISOS FIJOS{avisos.length ? ` (${avisos.length})` : ""}</div>
              <div className="campana-avisos">
                {avisos.length ? <AvisosFijos avisos={avisos} /> : <div className="campana-vacio" style={{ padding: "6px 0" }}>No hay avisos para ti hoy.</div>}
              </div>
              {puedeAdministrar && rutaAdmin && (
                <Link href={rutaAdmin} className="campana-pie" onClick={() => setOpen(false)}>
                  Administrar avisos fijos ›
                </Link>
              )}
            </>
          )}
          {rutaTodas && (
            <Link href={rutaTodas} className="campana-pie gris" onClick={() => setOpen(false)}>
              Ver todas y configurar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
