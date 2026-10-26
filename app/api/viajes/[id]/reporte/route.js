import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser } from "@/lib/roles";
import { filaAViaje, filaAIns, filaABuzo } from "@/lib/viajes/datos";
import { permisosViajes, resumenViaje, numerosViaje, estadoViaje, estadoPago, pagoEnDop, fechaLarga, rd, ESTADOS_VIAJE, hoyISO, fechaCorta } from "@/lib/viajes/modelo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const h = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// V42 -- "Enviar por correo" el reporte de un viaje (mismo contenido que
// la pantalla Reporte). Los números solo van si quien lo manda los puede ver.
export async function POST(request, { params }) {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const p = permisosViajes(profile);
  if (!p.ver) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const correo = String(body.correo || "").trim();
  if (!EMAIL_REGEX.test(correo)) return NextResponse.json({ error: "Ese correo no es válido." }, { status: 400 });

  const { data: vrow } = await supabase.from("viajes").select("*").eq("id", params.id).maybeSingle();
  if (!vrow) return NextResponse.json({ error: "Viaje no encontrado" }, { status: 404 });
  const v = filaAViaje(vrow);
  const { data: insRows } = await supabase.from("viajes_inscripciones").select("*").eq("viaje_id", v.id);
  const inscripciones = (insRows || []).map(filaAIns);
  const ids = [...new Set(inscripciones.map((x) => x.buzoId))];
  const { data: buzoRows } = ids.length ? await supabase.from("viajes_buzos").select("*").in("id", ids) : { data: [] };
  const db = { viajes: [v], inscripciones, buzos: (buzoRows || []).map(filaABuzo) };
  const r = resumenViaje(db, v);
  const n = numerosViaje(db, v);
  const ev = estadoViaje(v);
  const pasado = ["realizado", "cerrado"].includes(ev);
  const verPagos = p.pagos || p.conciliar;

  const filas = r.ins
    .slice()
    .sort((a, b) => (a.rol === "staff") - (b.rol === "staff"))
    .map((x, i) => {
      const b = db.buzos.find((y) => y.id === x.buzoId);
      const o = v.opciones.find((y) => y.id === x.opcionId);
      const pagado = (x.pagos || []).reduce((a, pg) => a + pagoEnDop(v, pg), 0);
      return `<tr><td>${i + 1}</td><td>${h(b?.nombre)}</td><td>${h(x.rol === "staff" ? "Staff" : o?.nombre)}</td>${
        pasado ? `<td>${x.asistio ? "Sí" : x.asistio === false ? "No" : "—"}</td>` : ""
      }${verPagos ? `<td>${h(estadoPago(v, x).t)}</td><td>${pagado ? rd(pagado) : "—"}</td>` : ""}</tr>`;
    })
    .join("");
  const td = 'style="padding:6px 8px;border-bottom:1px solid #e3eaef;font-size:13px;text-align:left"';
  const tabla = (cabeza, cuerpo) =>
    `<table style="border-collapse:collapse;width:100%;margin-top:6px">${cabeza ? `<tr>${cabeza}</tr>` : ""}${cuerpo}</table>`.replace(/<td>/g, `<td ${td}>`).replace(/<th>/g, `<th ${td.replace("13px", "11px;color:#5c6b78")}>`);
  const sec = (t) => `<div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#1b7fae;border-bottom:2px solid #4ebae8;margin:18px 0 4px;padding-bottom:3px">${t}</div>`;
  const numeros = p.numeros
    ? sec("NÚMEROS") +
      tabla(
        "<th></th><th>Estimado</th><th>Real</th>",
        `<tr><td>Ingresos</td><td>${rd(n.ingresoEstimado)}</td><td>${rd(n.cobrado)}</td></tr>
         <tr><td>Gastos</td><td>${rd(n.costoEstimado)}</td><td>${(v.gastos || []).length ? rd(n.gastosReales) : "—"}</td></tr>
         <tr><td><b>Ganancia</b></td><td><b>${rd(n.gananciaEstimada)}</b></td><td><b>${(v.gastos || []).length ? rd(n.gananciaReal) : "—"}</b></td></tr>`
      )
    : "";

  const html = `<div style="font-family:Arial,sans-serif;color:#1a2733;max-width:680px">
    <div style="background:#4ebae8;color:#06324f;padding:16px 18px;border-radius:10px 10px 0 0">
      <div style="font-size:11px;font-weight:800;letter-spacing:.12em">REPORTE DEL VIAJE</div>
      <div style="font-size:20px;font-weight:800">${h(v.nombre)}</div>
      <div style="font-size:13px">${h(fechaLarga(v.fecha))} · ${h(v.salida)}</div>
    </div>
    <div style="border:1px solid #dfe6ea;border-top:0;padding:14px 18px;border-radius:0 0 10px 10px">
      <div style="font-size:14px"><b>${r.buzos.length}</b> inscritos${pasado ? ` · <b>${r.asistieron}</b> asistieron · <b>${r.noVinieron}</b> no vinieron` : ""} · <b>${r.staff.length}</b> staff · ${h(ESTADOS_VIAJE[ev].t)}</div>
      ${sec("PARTICIPANTES")}
      ${tabla(`<th>#</th><th>Nombre</th><th>Opción</th>${pasado ? "<th>Asistió</th>" : ""}${verPagos ? "<th>Pago</th><th>Pagado</th>" : ""}`, filas)}
      ${numeros}
      <div style="margin-top:16px;font-size:12px;color:#8795a1;text-align:right">Generado el ${fechaCorta(hoyISO())} · Gus Dive Center</div>
    </div>
  </div>`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
    to: [correo],
    subject: `Reporte del viaje: ${v.nombre} (${fechaCorta(v.fecha)})`,
    html,
  });
  if (error) return NextResponse.json({ error: error?.message || "No se pudo enviar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
