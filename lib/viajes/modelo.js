// V42 -- Viajes/Buceos: cálculos compartidos (precios, estado del pago,
// estado del viaje, números, recordatorios) y permisos. Lo usan las
// pantallas del app, el link público y el reporte. Viene de la maqueta
// aprobada (maqueta-viajes-v2.html).

export const CUENTAS = [
  { t: "Popular DOP (Gugi) ··9134", m: "DOP" },
  { t: "Popular USD (Gugi) ··7133", m: "USD" },
  { t: "Popular Gus Dive", m: "DOP" },
  { t: "Efectivo DOP", m: "DOP" },
  { t: "Efectivo USD", m: "USD" },
];

export const PREGUNTAS = [
  { k: "nivel", t: "Nivel de certificación", tipo: "op", ops: ["Open Water", "Advanced", "Rescue", "Divemaster", "Instructor"] },
  { k: "ultimoBuceo", t: "¿Cuándo fue tu último buceo?", tipo: "op", ops: ["En los últimos 3 meses", "Hace 3 a 12 meses", "Hace más de 1 año"] },
  { k: "cantBuceos", t: "¿Cuántos buceos tienes registrados?", tipo: "num" },
  { k: "conQuien", t: "¿Con quién vienes?", tipo: "txt" },
  { k: "emergencia", t: "Contacto de emergencia (nombre y teléfono)", tipo: "txt", guarda: true },
  { k: "buzoOSnorkel", t: "¿Vas a bucear o vas de acompañante (snorkel)?", tipo: "op", ops: ["Buzo certificado", "Acompañante snorkel"] },
];

const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
// Hoy en la hora de República Dominicana (UTC-4), aunque el servidor esté en UTC.
export function hoyISO() {
  const d = new Date(Date.now() - 4 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const MES_CORTO = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

export const fechaObj = (iso) => new Date(`${iso}T12:00:00`);
export const isoDe = isoLocal;
export const sumarDias = (iso, n) => {
  const d = fechaObj(iso);
  d.setDate(d.getDate() + n);
  return isoDe(d);
};
export const fechaLarga = (iso) => {
  const d = fechaObj(iso);
  return `${DIAS_LARGO[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
export const fechaCorta = (iso) => {
  const d = fechaObj(iso);
  return `${d.getDate()} ${MES_CORTO[d.getMonth()].toLowerCase()}`;
};
export const diasPara = (iso) => Math.round((fechaObj(iso) - fechaObj(hoyISO())) / 86400000);
export const ahora = () => {
  const d = new Date();
  return `${isoLocal(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const rd = (n) => (n < 0 ? "−" : "") + "RD$" + Math.round(Math.abs(n || 0)).toLocaleString("en-US");
export const us = (n) => "US$" + n;
export const soloDigitos = (t) => String(t || "").replace(/\D/g, "");

// 8091234567 -> 809-123-4567 (también mientras se escribe)
// V65 ("284"): números de otros países. Se guardan solo los dígitos: 10 =
// +1 (RD, EE.UU., Puerto Rico, Canadá); de otro país, el código del país
// y el número juntos (11 a 15 dígitos, por ejemplo 34612345678 = España).
export const esCelExtranjero = (t) => {
  const d = soloDigitos(t);
  if (String(t || "").trim().startsWith("+")) return !(d[0] === "1" && d.length <= 11);
  return d.length > 11 || (d.length === 11 && d[0] !== "1");
};
export function celValido(t) {
  const d = soloDigitos(t);
  if (esCelExtranjero(t)) return d.length >= 9 && d.length <= 15;
  return d.length === 10 || (d.length === 11 && d[0] === "1");
}
// Lo que se guarda: 10 dígitos para +1; si no, el código + el número.
export function celGuardar(t) {
  let d = soloDigitos(t);
  if (!esCelExtranjero(t) && d.length === 11 && d[0] === "1") d = d.slice(1);
  return d;
}
export function formatoCel(t) {
  let d = soloDigitos(t);
  if (esCelExtranjero(t)) return `+${d.slice(0, 15)}`;
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length > 6) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}
export const celOculto = (t) => {
  // V65: de otro país, "+34•••5678".
  if (esCelExtranjero(t)) {
    const d = soloDigitos(t);
    return `+${d.slice(0, d.length > 11 ? 3 : 2)}•••${d.slice(-4)}`;
  }
  const f = formatoCel(t);
  return f.length === 12 ? `${f.slice(0, 3)}-•••-${f.slice(8)}` : f;
};
// 00112345678 -> 001-1234567-8
export function formatoCedula(t) {
  const d = soloDigitos(t).slice(0, 11);
  if (d.length > 10) return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10)}`;
  if (d.length > 3) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return d;
}
export const nombreCorto = (n) => {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]}.` : p[0];
};
export const primerNombre = (n) => (n || "").trim().split(/\s+/)[0];

// ---------------------------------------------------------------- precios
export const precioDop = (v, o) => (o.dop != null ? o.dop : Math.round((o.usd || 0) * (v.tasa || 62)));
export const precioTexto = (v, o) => {
  if (o.noPaga) return "No paga";
  if (v.moneda === "USD") return `${us(o.usd)}${o.dop != null ? ` o ${rd(o.dop)}` : ` (${rd(precioDop(v, o))})`}`;
  return rd(o.dop);
};
export const monedaCuenta = (c) => CUENTAS.find((x) => x.t === c)?.m || "DOP";
export const pagoEnDop = (v, p) => (monedaCuenta(p.cuenta) === "USD" ? Math.round(p.monto * (v.tasa || 62)) : p.monto);
export const montoTexto = (p) => (monedaCuenta(p.cuenta) === "USD" ? us(p.monto) : rd(p.monto));

export function precioInscripcion(v, x) {
  if (x.rol !== "buzo") return 0;
  const o = v.opciones.find((y) => y.id === x.opcionId) || v.opciones[0];
  if (o.noPaga) return 0;
  const extras = (x.extras || []).reduce((a, id) => a + (v.extras.find((e) => e.id === id)?.dop || 0), 0);
  return precioDop(v, o) + extras;
}

// Estado del pago: se calcula solo (nadie lo escoge a mano).
export function estadoPago(v, x) {
  if (x.rol === "staff") return { k: "staff", t: "Staff", c: "gris" };
  if (x.rol === "invitado") return { k: "invitado", t: "Invitado", c: "gris" };
  if (x.rol === "curso") return { k: "curso", t: "Curso · no paga", c: "gris" };
  if (x.usaAbono) return { k: "abono", t: "Usa abono", c: "azul", pagado: 0, falta: 0 };
  if (x.pagadoPor) return { k: "otro", t: "Lo pagó otro", c: "azul", pagado: 0, falta: 0 };
  const precio = precioInscripcion(v, x);
  const pagado = (x.pagos || []).reduce((a, p) => a + pagoEnDop(v, p), 0);
  const falta = Math.max(0, precio - pagado);
  const porConciliar = (x.pagos || []).filter((p) => !p.conciliado && !p.abono).length;
  if (pagado <= 0) return { k: "sin", t: "Sin pagar", c: "rojo", pagado, falta, precio, porConciliar };
  if (falta > 0) {
    const reserva = v.reserva && pagado >= v.reserva.monto && pagado < precio;
    return { k: "parcial", t: reserva ? `Reserva · falta ${rd(falta)}` : `Falta ${rd(falta)}`, c: "ambar", pagado, falta, precio, porConciliar };
  }
  return { k: "pagado", t: "Pagado", c: "verde", pagado, falta: 0, precio, porConciliar };
}

// ---------------------------------------------------------------- viajes
export const ESTADOS_VIAJE = {
  abierto: { t: "Inscripción abierta", c: "azul" },
  cerrado_insc: { t: "Inscripción cerrada", c: "ambar" },
  realizado: { t: "Ya pasó · por cerrar", c: "morado" },
  cerrado: { t: "Cerrado", c: "verde" },
  cancelado: { t: "Cancelado", c: "rojo" },
};
// Si la fecha ya pasó y nadie lo ha cerrado, pasa solo a "por cerrar".
export const estadoViaje = (v) => (["abierto", "cerrado_insc"].includes(v.estado) && diasPara(v.fecha) < 0 ? "realizado" : v.estado);

export function resumenViaje(db, v) {
  const todas = db.inscripciones.filter((x) => x.viajeId === v.id);
  const ins = todas.filter((x) => x.estado === "inscrito");
  const buzos = ins.filter((x) => x.rol !== "staff");
  const pagan = buzos.filter((x) => x.rol === "buzo");
  const espera = todas.filter((x) => x.estado === "espera");
  const ep = pagan.map((x) => estadoPago(v, x));
  return {
    ins,
    buzos,
    staff: ins.filter((x) => x.rol === "staff"),
    espera,
    sinPagar: ep.filter((e) => e.k === "sin" || e.k === "parcial").length,
    porConciliar: pagan.reduce((a, x) => a + (x.pagos || []).filter((p) => !p.conciliado && !p.abono).length, 0),
    porRevisar: ins.filter((x) => x.nuevo).length,
    sinGrupo: ins.filter((x) => !x.grupo).length,
    asistieron: ins.filter((x) => x.asistio === true).length,
    noVinieron: ins.filter((x) => x.asistio === false).length,
    sinMarcar: ins.filter((x) => x.asistio == null).length,
  };
}

export function numerosViaje(db, v) {
  const ins = db.inscripciones.filter((x) => x.viajeId === v.id && x.estado === "inscrito");
  const pagan = ins.filter((x) => x.rol === "buzo");
  const staff = ins.filter((x) => x.rol === "staff").length;
  const filas = v.opciones.map((o) => {
    const n = pagan.filter((x) => x.opcionId === o.id).length;
    const tasa = v.moneda === "USD" ? v.tasa : 1;
    return { o, n, ingreso: o.noPaga ? 0 : n * precioDop(v, o), costo: o.costo == null ? null : n * o.costo * tasa };
  });
  const extras = pagan.reduce((a, x) => a + (x.extras || []).reduce((b, id) => b + (v.extras.find((e) => e.id === id)?.dop || 0), 0), 0);
  const ingresoEstimado = filas.reduce((a, f) => a + f.ingreso, 0) + extras;
  const costoStaff = (v.costoStaff || 0) * staff * (v.moneda === "USD" ? v.tasa : 1);
  const costoEstimado = filas.reduce((a, f) => a + (f.costo || 0), 0) + costoStaff;
  const sinCosto = filas.some((f) => f.n > 0 && f.costo == null);
  const pagos = pagan.flatMap((x) => x.pagos || []);
  const cobrado = pagos.reduce((a, p) => a + pagoEnDop(v, p), 0);
  const conciliado = pagos.filter((p) => p.conciliado || p.abono).reduce((a, p) => a + pagoEnDop(v, p), 0);
  const gastosReales = (v.gastos || []).reduce((a, g) => a + (g.monto || 0), 0);
  return {
    filas,
    extras,
    staff,
    costoStaff,
    ingresoEstimado,
    costoEstimado,
    sinCosto,
    gananciaEstimada: ingresoEstimado - costoEstimado,
    cobrado,
    conciliado,
    gastosReales,
    gananciaReal: cobrado - gastosReales,
  };
}

// Recordatorios con fecha: los generales (todos los viajes) + los de cada viaje + los sueltos.
export function recordatoriosConFecha(db) {
  const out = [];
  for (const v of db.viajes) {
    const ev = estadoViaje(v);
    if (ev === "cancelado" || ev === "cerrado") continue;
    const despues = ev === "realizado"; // si ya pasó, solo los de después del viaje
    // Lo que tocaba antes de crear el viaje no sale (no se puede haber hecho).
    const vale = (dias) => (!despues || dias < 0) && (!v.creado || sumarDias(v.fecha, -dias) >= v.creado);
    for (const g of db.generales) if (vale(g.dias)) out.push({ key: `${v.id}-${g.id}`, fecha: sumarDias(v.fecha, -g.dias), texto: g.texto, para: g.para, viaje: v, general: true });
    for (const r of v.recordatorios || []) if (vale(r.dias)) out.push({ key: `${v.id}-${r.id}`, fecha: sumarDias(v.fecha, -r.dias), texto: r.texto, para: r.para || [], viaje: v });
  }
  for (const l of db.libres) out.push({ key: l.id, fecha: l.fecha, texto: l.texto, para: l.para, libre: true });
  return out.map((r) => ({ ...r, hecho: !!db.hechos[r.key] })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// ---------------------------------------------------------------- accesos
// Claves en profiles.permisos (migration_71.sql). "ver" = acceso_viajes.
export const PERMISOS = [
  { k: "ver", clave: "acceso_viajes", t: "Ver buceos, inscritos y calendario" },
  { k: "editarViaje", clave: "viajes_editar", t: "Crear y editar buceos, catálogo y recordatorios" },
  { k: "inscribir", clave: "viajes_inscribir", t: "Inscribir y editar buzos" },
  { k: "grupo", clave: "viajes_grupo", t: "Marcar grupo de WhatsApp, asistencia, notas y pendientes" },
  { k: "pagos", clave: "viajes_pagos", t: "Registrar pagos" },
  { k: "buzos", clave: "viajes_buzos", t: "Ver la lista de buzos" },
  { k: "web", clave: "viajes_web", t: "Publicar en la página web" },
  { k: "conciliar", clave: "viajes_conciliar", t: "Conciliación", soloAdmin: true },
  { k: "numeros", clave: "viajes_numeros", t: "Números del buceo (estimado y real)", soloAdmin: true },
  { k: "cerrar", clave: "viajes_cerrar", t: "Cerrar, cancelar o reabrir buceos", soloAdmin: true },
  { k: "bitacora", clave: "viajes_bitacora", t: "Bitácora (cada movimiento)", soloAdmin: true },
  { k: "estadisticas", clave: "viajes_estadisticas", t: "Estadísticas (charts)", soloAdmin: true },
];

// Lo que puede hacer esta persona en Viajes (el Titular, todo).
export function permisosViajes(profile) {
  const p = {};
  for (const x of PERMISOS) {
    if (!profile) p[x.k] = false;
    else if (profile.es_titular) p[x.k] = true;
    else if (!profile.permisos?.acceso_viajes) p[x.k] = false;
    else if (x.k === "ver") p[x.k] = true;
    else p[x.k] = !!profile.permisos?.[x.clave] && (!x.soloAdmin || !!profile.is_admin);
  }
  return p;
}

// Id nuevo (uuid) para filas que se crean desde el navegador.
export const nuevoIdLocal = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

// ---------------------------------------------------------------------------
// V44 -- Equipo que hace falta en un viaje, para mandárselo al operador un
// par de días antes (pedido de Pipe: "necesito poder sacar un reporte de eso
// para enviárselo a los operadores ... así ya ellos saben los equipos que
// harán falta"). Agrupado por quién pone el equipo (en Tiburones: Gus o
// Nobel allá), con el total por pieza y talla.
const TALLA_DE = (pz, t = {}) =>
  /BCD|chaleco/i.test(pz) ? t.bcd : /Wetsuit|Traje/i.test(pz) ? t.wetsuit || t.bcd : /Chapaletas|Aletas/i.test(pz) ? t.chapaletas : null;
const LLEVA_TALLA = (pz) => /BCD|chaleco|Wetsuit|Traje|Chapaletas|Aletas/i.test(pz);

// V52: "9 buzos y 2 guías" (Inscritos cuenta solo los buzos).
const cuantosTexto = (buzos, guias) => `${buzos === 1 ? "1 buzo" : `${buzos} buzos`}${guias ? ` y ${guias === 1 ? "1 guía" : `${guias} guías`}` : ""}`;

export function equipoViaje(db, v) {
  const eq = v.equipo || {};
  const ins = db.inscripciones.filter((x) => x.viajeId === v.id && x.estado === "inscrito" && x.rol !== "staff");
  const quien = (x) => {
    if (!eq.donde) return eq.proveedor || v.operador || "el operador";
    const d = eq.donde.find((y) => y.id === x.equipo?.donde);
    if (!d) return null;
    return d.id === "gus" ? "Gus" : eq.proveedor || v.operador || "el operador";
  };
  const alquilan = ins.filter((x) => (x.equipo?.piezas || []).length && quien(x));
  const grupos = [];
  for (const x of alquilan) {
    const b = db.buzos.find((y) => y.id === x.buzoId) || { nombre: "—", tallas: {} };
    const prov = quien(x);
    let g = grupos.find((y) => y.prov === prov);
    if (!g) grupos.push((g = { prov, filas: [], totales: [] }));
    const piezas = (eq.piezas || []).filter((pz) => x.equipo.piezas.includes(pz)).map((pz) => {
      const talla = LLEVA_TALLA(pz) ? TALLA_DE(pz, b.tallas) || "" : null;
      return { pz, talla, falta: LLEVA_TALLA(pz) && !talla };
    });
    g.filas.push({ id: x.id, buzoId: b.id, nombre: b.nombre, cel: b.cel, piezas });
  }
  for (const g of grupos) {
    g.filas.sort((a, b) => a.nombre.localeCompare(b.nombre));
    g.totales = (eq.piezas || [])
      .map((pz) => {
        const con = g.filas.flatMap((f) => f.piezas.filter((p) => p.pz === pz));
        const tallas = {};
        for (const p of con) if (p.talla) tallas[p.talla] = (tallas[p.talla] || 0) + 1;
        return { pz, n: con.length, tallas, faltan: con.filter((p) => p.falta).length };
      })
      .filter((t) => t.n > 0);
  }
  grupos.sort((a, b) => (a.prov === "Gus") - (b.prov === "Gus"));
// V52 -- "Reporte de listado de buzos para proveedor" (maqueta-v52-preguntas.html,
  // "38. Me gusta el B ... que figuren todos los buzos. Los que necesitan
  // equipo arriba diciendo lo que necesitan y los que no, que estén en la
  // parte de abajo del reporte"). `reportes` son los grupos de arriba con
  // `otros` (todos los demás inscritos, guías incluidos, con una nota), y
  // siempre trae el del operador aunque nadie le alquile, porque el
  // operador necesita la lista de todas formas.
  const provOp = eq.proveedor || v.operador || "el operador";
  const reportes = [...grupos];
  if (provOp !== "Gus" && !reportes.some((g) => g.prov === provOp)) reportes.unshift({ prov: provOp, filas: [], totales: [] });
  const todos = db.inscripciones.filter((x) => x.viajeId === v.id && x.estado === "inscrito");
  for (const g of reportes) {
    const dentro = new Set(g.filas.map((f) => f.id));
    // El de "Equipo que pone Gus" es para nosotros, no para un proveedor: sin la lista de los demás.
    g.otros = g.prov === "Gus" ? [] : todos
      .filter((x) => !dentro.has(x.id))
      .map((x) => {
        const b = db.buzos.find((y) => y.id === x.buzoId) || { nombre: "—" };
        const otro = alquilan.includes(x) ? quien(x) : null;
        return { id: x.id, buzoId: b.id, nombre: b.nombre, guia: x.rol === "staff", nota: x.rol === "staff" ? "Guía" : otro === "Gus" ? "Equipo de Gus" : otro ? `Alquila con ${otro}` : "Equipo propio" };
      })
      .sort((a, b) => a.guia - b.guia || a.nombre.localeCompare(b.nombre));
    g.total = g.filas.length + g.otros.length;
    g.guias = g.otros.filter((f) => f.guia).length;
    g.cuantos = cuantosTexto(g.total - g.guias, g.guias);
  }
  return { grupos, reportes, propio: ins.length - alquilan.length, sinTalla: grupos.flatMap((g) => g.filas).filter((f) => f.piezas.some((p) => p.falta)) };
}

const tallasTexto = (t) =>
  Object.entries(t.tallas)
    .sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true }))
    .map(([k, n]) => (n > 1 ? `${k} ×${n}` : k))
    .concat(t.faltan ? [`${t.faltan} sin talla`] : [])
    .join(", ");
export const resumenTalla = tallasTexto;

// Texto para mandar por WhatsApp (o copiar).
// V44 -- Avisos (migration_72.sql): qué pasa y por dónde le llega a cada
// quien. El Titular lo escoge por persona en ⚙ › Administración.
export const EVENTOS_AVISO = [
  { k: "inscripcion", t: "Alguien se inscribe por el link", sub: "También si queda en lista de espera." },
  { k: "comprobante", t: "Un buzo sube su comprobante de pago" },
  { k: "lleno", t: "Un buceo se llena", sub: "Llega al cupo máximo; los próximos quedan en lista de espera." },
  // V64 ("279", "281"): desde su perfil del link.
  { k: "perfil", t: "Un buzo cambia su celular o sube su certificación", sub: "Desde \"Mi perfil\" en el link." },
];
export const VIAS_AVISO = [
  { k: "app", t: "En el app", sub: "La campanita de Buceos y la tarjeta al entrar." },
  { k: "correo", t: "Correo", sub: "Al correo con que entra al app." },
  { k: "cel", t: "Celular", sub: "Notificación en el teléfono (cada quien la activa en su celular)." },
];

// V47 -- Tallas. Pedidos: "que no salga talla de chapaletas si el buzo no marca
// chapaletas. lo mismo para size de bcd y wetsuit" y "que las opciones sea un
// drop down. Size de bcd o wetsuit XS S M L XL XXL. opciones para tallas
// chapaletas del 36 a 43 ... y ponle el size también en US". Se guarda el
// número europeo; el US (hombre · mujer) es solo para escoger. Monte Cristi:
// "BCD / chaleco", "Traje", "Aletas, máscara y snorkel".
const TALLAS_ROPA = ["XS", "S", "M", "L", "XL", "XXL"].map((x) => ({ v: x, t: x }));
const TALLAS_CHAP = [
  ["36", "4", "5.5"],
  ["37", "4.5", "6.5"],
  ["38", "5.5", "7.5"],
  ["39", "6.5", "8.5"],
  ["40", "7", "9.5"],
  ["41", "8", "10.5"],
  ["42", "9", "11.5"],
  ["43", "10", "12.5"],
].map(([eu, h, m]) => ({ v: eu, t: `${eu} / US ${h} hombre · ${m} mujer` }));
export const TALLAS = [
  { k: "bcd", t: "Talla del BCD", re: /BCD|chaleco/i, ops: TALLAS_ROPA },
  { k: "wetsuit", t: "Talla del wetsuit", re: /Wetsuit|Traje/i, ops: TALLAS_ROPA },
  { k: "chapaletas", t: "Talla de chapaletas", re: /Chapaletas|Aletas/i, ops: TALLAS_CHAP },
];
export const tallasPara = (piezas) => TALLAS.filter((t) => (piezas || []).some((p) => t.re.test(p)));

// V45 -- En lo que ve el buzo se dice "buceo"; "viaje" solo para los que tienen
// hotel (Monte Cristi). Pedido explícito: "la palabra viaje no quiero usarla
// mucho, eso pienso que solo aplica para monte cristi. Utiliza la palabra buceo".
export const palabraViaje = (v) => {
  const h = v?.habitaciones;
  return (Array.isArray(h) ? h.length > 0 : !!h) ? "viaje" : "buceo";
};

// V44 -- "Incluye" / "No incluye" en puntos (pedido de Pipe: "pon esto lo
// que incluye y lo que no incluye tipo bullets"). Cada línea del texto es
// un punto; un texto viejo de una sola línea sale como un solo punto.
export const puntos = (texto) =>
  String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((l) => l.charAt(0).toUpperCase() + l.slice(1));

// V59 (165) -- La salida en partes: "6:30 AM desde la tienda" → hora "6:30 AM",
// lugar "desde la tienda" (para el cuadro grande del link y el calendario).
export function partesSalida(salida) {
  const t = String(salida || "").trim();
  if (!t) return { hora: "", lugar: "", h: null, m: 0 };
  const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i;
  let mt = t.match(re);
  let h = null;
  let m = 0;
  if (mt) {
    h = Number(mt[1]) % 12;
    m = Number(mt[2] || 0);
    if (/p/i.test(mt[3])) h += 12;
  } else {
    mt = t.match(/(\d{1,2}):(\d{2})/);
    if (mt) {
      h = Number(mt[1]);
      m = Number(mt[2]);
    }
  }
  if (!mt || h > 23 || m > 59) return { hora: "", lugar: t, h: null, m: 0 };
  const hora = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  const lugar = (t.slice(0, mt.index) + " " + t.slice(mt.index + mt[0].length)).replace(/^[\s·,.\-–—]+|[\s·,.\-–—]+$/g, "").replace(/\s+/g, " ");
  return { hora, lugar, h, m };
}

// Para el calendario del buzo: inicio y fin en UTC (RD es UTC-4 todo el año).
// Sin hora de salida, el evento es de todo el día.
function fechasEvento(v) {
  const { h, m } = partesSalida(v.salida);
  const dias = v.finDeSemana ? 3 : 1;
  if (h == null) return { todoElDia: true, ini: v.fecha.replace(/-/g, ""), fin: sumarDias(v.fecha, dias).replace(/-/g, "") };
  const [a, mes, d] = v.fecha.split("-").map(Number);
  const ini = new Date(Date.UTC(a, mes - 1, d, h + 4, m));
  const fin = new Date(ini.getTime() + (v.finDeSemana ? 48 : 8) * 3600 * 1000);
  const f = (x) => x.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return { todoElDia: false, ini: f(ini), fin: f(fin) };
}

function detalleEvento(v, link) {
  const e = v.encuentro || {};
  return [
    v.salida ? `Salida: ${v.salida}` : "",
    e.hora || e.lugar ? `Si llegas directo: ${[e.hora ? `a las ${e.hora}` : "", e.lugar].filter(Boolean).join(" ")}` : "",
    e.mapa ? `Ubicación: ${e.mapa}` : "",
    link ? `Tu inscripción: ${link}` : "",
    "Gus Dive Center",
  ]
    .filter(Boolean)
    .join("\n");
}

export function linkGoogleCalendar(v, link) {
  const { ini, fin } = fechasEvento(v);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${v.nombre} · Gus Dive Center`,
    dates: `${ini}/${fin}`,
    details: detalleEvento(v, link),
    location: "Gus Dive Center",
    ctz: "America/Santo_Domingo",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

export function textoIcs(v, link) {
  const esc = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  const { todoElDia, ini, fin } = fechasEvento(v);
  const ahora = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gus Dive Center//Inscripcion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:inscripcion-${v.slug || v.id}@gusdive`,
    `DTSTAMP:${ahora}`,
    todoElDia ? `DTSTART;VALUE=DATE:${ini}` : `DTSTART:${ini}`,
    todoElDia ? `DTEND;VALUE=DATE:${fin}` : `DTEND:${fin}`,
    `SUMMARY:${esc(`${v.nombre} · Gus Dive Center`)}`,
    `DESCRIPTION:${esc(detalleEvento(v, link))}`,
    "LOCATION:Gus Dive Center",
    "BEGIN:VALARM",
    "TRIGGER:-PT12H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`Mañana: ${v.nombre}`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// V68 ("13. B", maqueta V68): la cédula dominicana se comprueba con su último
// número (el dígito verificador). Detecta números mal escritos o inventados;
// no dice si la persona existe. Se usa solo con gente que no está en la base:
// a quien ya está (aunque tenga una cédula vieja que no pase) se le deja seguir.
export function cedulaValida(doc) {
  const d = String(doc || "").replace(/\D/g, "");
  if (d.length !== 11) return false;
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(d[i]) * (i % 2 === 0 ? 1 : 2);
    if (n > 9) n -= 9;
    suma += n;
  }
  return (10 - (suma % 10)) % 10 === Number(d[10]);
}
export const MSG_CEDULA_MALA = "Esa cédula no es válida. Revisa los números.";

// V68 ("14"): el link de invitación de un grupo de WhatsApp.
export const linkGrupoValido = (u) => /^https:\/\/(chat\.whatsapp\.com|whatsapp\.com\/channel)\/[A-Za-z0-9_-]{6,}/.test(String(u || "").trim());
