import { hoyISO, sumarDias, totalDe, rd, fechaCorta } from "./modelo";

// V91 (maqueta v91 "6", aprobada): el reporte semanal de Alquiler, con los
// alquileres de la semana, las devoluciones, lo que sigue afuera y lo atrasado.
// Lo usan la pantalla de Alquiler y el correo de los reportes automáticos.
export function resumenSemana(alquileres = [], { desde, hasta, hoy = hoyISO() } = {}) {
  const enRango = (f) => !!f && f >= desde && f <= hasta;
  const entregados = alquileres.filter((a) => enRango(a.fecha));
  const devueltos = [];
  const pendientes = [];
  for (const a of alquileres) {
    for (const x of a.items || []) {
      if (x.devueltoEn) {
        if (enRango(String(x.devueltoEn).slice(0, 10))) devueltos.push({ a, x });
      } else {
        pendientes.push({ a, x });
      }
    }
  }
  const atrasados = pendientes.filter(({ a }) => hoy > a.devolver);
  return {
    desde,
    hasta,
    hoy,
    entregados,
    total: entregados.reduce((s, a) => s + totalDe(a), 0),
    incluidos: entregados.filter((a) => a.estudiante).length,
    devueltos,
    mora: devueltos.reduce((s, { x }) => s + Number(x.mora || 0), 0),
    pendientes,
    atrasados,
  };
}

// Semana completa anterior (lunes a domingo), según la fecha de hoy.
export function semanaAnterior(hoy = hoyISO()) {
  return { desde: sumarDias(hoy, -7), hasta: sumarDias(hoy, -1) };
}

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Bloque de correo (HTML con estilos en línea) para el reporte automático.
export function htmlSemanaAlquiler(r, { nombreDe = () => "" } = {}) {
  const filaA = (a) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${fechaCorta(a.fecha)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(a.numero)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(nombreDe(a))}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(a.items.map((x) => x.codigo).join(", "))}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${rd(totalDe(a))}</td></tr>`;
  const filaP = ({ a, x }) => `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(nombreDe(a))}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(x.codigo)}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${fechaCorta(a.devolver)}</td></tr>`;
  const tabla = (cab, filas, vacio) =>
    filas.length
      ? `<table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr>${cab.map((c) => `<th style="text-align:left;padding:6px 8px;background:#f4f7f9;color:#5c6b78;font-size:11px;text-transform:uppercase;">${c}</th>`).join("")}</tr></thead><tbody>${filas.join("")}</tbody></table>`
      : `<p style="font-size:13px;color:#5c6b78;margin:6px 0 0;">${vacio}</p>`;
  return `
    <div style="margin-top:24px;border:1px solid #dfe6ea;border-radius:10px;overflow:hidden;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="background:#CD392A;color:#fff;padding:12px 16px;"><b>Alquiler · semana del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}</b></div>
      <div style="padding:14px 16px;font-size:14px;line-height:1.6;">
        <div><b>${r.entregados.length}</b> alquileres entregados · <b>${rd(r.total)}</b></div>
        <div><b>${r.devueltos.length}</b> equipos devueltos · mora cobrada <b>${rd(r.mora)}</b></div>
        <div><b>${r.pendientes.length}</b> equipos afuera hoy · <b>${r.atrasados.length}</b> atrasados</div>
        <div>Incluidos en cursos (sin cobro): <b>${r.incluidos}</b></div>
        <p style="margin:14px 0 4px;font-weight:800;color:#06324f;">Alquileres de la semana</p>
        ${tabla(["Fecha", "No.", "Cliente", "Equipos", "Total"], r.entregados.map(filaA), "No hubo alquileres esta semana.")}
        <p style="margin:14px 0 4px;font-weight:800;color:#06324f;">Atrasados</p>
        ${tabla(["Cliente", "Equipo", "Debía devolver"], r.atrasados.map(filaP), "Nada atrasado.")}
        <p style="margin:14px 0 4px;font-weight:800;color:#06324f;">Afuera hoy</p>
        ${tabla(["Cliente", "Equipo", "Debía devolver"], r.pendientes.map(filaP), "Todo está de regreso.")}
      </div>
    </div>`;
}
