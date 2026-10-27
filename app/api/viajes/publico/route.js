import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { filaAViaje, filaABuzo, buzoAFila, nuevoId } from "@/lib/viajes/datos";
import { formatoCedula, soloDigitos, celOculto, nombreCorto, primerNombre, estadoViaje, PREGUNTAS, fechaCorta } from "@/lib/viajes/modelo";
import { avisar } from "@/lib/viajes/avisos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// V42 -- Lo que hace el link de inscripción de un viaje (lo abre el buzo,
// sin cuenta). Corre con la llave del servidor; al buzo solo se le
// devuelve su nombre corto ("Laura C.") y el celular tapado, nunca sus
// datos completos.
//   accion "doc"        -> ¿esta cédula/pasaporte ya está en la base?
//   accion "cel"        -> buzos viejos sin cédula con ese celular
//   accion "inscribir"  -> lo inscribe (o lo pone en lista de espera)

const docLimpio = (tipo, doc) => (tipo === "pasaporte" ? String(doc || "").toUpperCase().replace(/\s/g, "") : formatoCedula(doc));

async function buscarPorDoc(s, tipo, doc) {
  const valor = docLimpio(tipo, doc);
  if (!valor) return null;
  const { data } = await s
    .from("viajes_buzos")
    .select("*")
    .eq(tipo === "pasaporte" ? "pasaporte" : "documento", valor)
    .maybeSingle();
  return data ? filaABuzo(data) : null;
}

function docValido(tipo, doc) {
  if (tipo === "pasaporte") return String(doc || "").replace(/\s/g, "").length >= 6;
  return soloDigitos(doc).length === 11;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  const { data: vrow } = await s.from("viajes").select("*").eq("slug", String(body.slug || "")).maybeSingle();
  if (!vrow) return NextResponse.json({ error: "Ese viaje no existe." }, { status: 404 });
  const v = filaAViaje(vrow);
  const tipo = body.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";

  if (body.accion === "doc") {
    if (!docValido(tipo, body.doc)) return NextResponse.json({ error: tipo === "cedula" ? "La cédula tiene 11 números." : "Escribe tu pasaporte completo." }, { status: 400 });
    const b = await buscarPorDoc(s, tipo, body.doc);
    if (!b || b.staff) return NextResponse.json({ encontrado: false });
    const { data: ya } = await s.from("viajes_inscripciones").select("estado").eq("viaje_id", v.id).eq("buzo_id", b.id).maybeSingle();
    return NextResponse.json({
      encontrado: true,
      corto: nombreCorto(b.nombre),
      primer: primerNombre(b.nombre),
      cel: celOculto(b.cel),
      tieneTallas: !!(b.tallas?.bcd && b.tallas?.chapaletas),
      yaInscrito: !!ya && ya.estado !== "quitado",
    });
  }

  if (body.accion === "cel") {
    const cel = soloDigitos(body.cel);
    if (cel.length !== 10) return NextResponse.json({ error: "Escribe tu celular completo (10 números)." }, { status: 400 });
    const { data } = await s.from("viajes_buzos").select("id, nombre, documento, pasaporte, es_staff").eq("celular", cel);
    const candidatos = (data || []).filter((b) => !b.documento && !b.pasaporte && !b.es_staff).map((b) => ({ id: b.id, corto: nombreCorto(b.nombre) }));
    return NextResponse.json({ candidatos });
  }

  if (body.accion !== "inscribir") return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });

  // ------------------------------------------------------------ inscribir
  if (estadoViaje(v) !== "abierto") return NextResponse.json({ error: "La inscripción para este viaje está cerrada." }, { status: 400 });
  if (!docValido(tipo, body.doc)) return NextResponse.json({ error: "Revisa tu cédula o pasaporte." }, { status: 400 });
  const o = v.opciones.find((x) => x.id === body.opcion && !x.noPaga);
  if (!o) return NextResponse.json({ error: "Escoge una opción del viaje." }, { status: 400 });
  if (v.requisito && !body.acepto) return NextResponse.json({ error: "Tienes que aceptar el requisito del viaje." }, { status: 400 });

  let b = await buscarPorDoc(s, tipo, body.doc);
  let nuevo = false;
  if (!b && body.vincularId) {
    // Buzo viejo (de antes del app) que todavía no tenía cédula: se le guarda.
    const { data: viejo } = await s.from("viajes_buzos").select("*").eq("id", body.vincularId).maybeSingle();
    if (viejo && !viejo.documento && !viejo.pasaporte && soloDigitos(viejo.celular) === soloDigitos(body.cel)) {
      const cambio = tipo === "pasaporte" ? { pasaporte: docLimpio(tipo, body.doc) } : { documento: docLimpio(tipo, body.doc) };
      await s.from("viajes_buzos").update(cambio).eq("id", viejo.id);
      b = filaABuzo({ ...viejo, ...cambio });
      await s.from("viajes_bitacora").insert({ viaje_id: v.id, quien: "Link", texto: `Guardó su ${tipo === "pasaporte" ? "pasaporte" : "cédula"} por el link: ${viejo.nombre}` });
    }
  }
  if (!b) {
    const n = body.nuevo || {};
    if (!String(n.nombre || "").trim() || !n.agencia) return NextResponse.json({ error: "Falta tu nombre y tu certificación." }, { status: 400 });
    if (soloDigitos(n.cel).length !== 10) return NextResponse.json({ error: "Escribe tu celular completo." }, { status: 400 });
    b = {
      id: nuevoId(),
      nombre: String(n.nombre).trim().slice(0, 120),
      doc: tipo === "cedula" ? body.doc : "",
      pasaporte: tipo === "pasaporte" ? body.doc : "",
      cel: soloDigitos(n.cel),
      correo: String(n.correo || "").trim().slice(0, 120),
      agencia: String(n.agencia).slice(0, 60),
      nivel: String(body.respuestas?.nivel || "").slice(0, 60),
      cert: String(n.cert || "").trim().slice(0, 60),
      tallas: {},
      abono: 0,
      staff: false,
    };
    const { error } = await s.from("viajes_buzos").insert(buzoAFila(b));
    if (error) return NextResponse.json({ error: "No se pudo guardar tus datos. Intenta de nuevo." }, { status: 500 });
    nuevo = true;
  }

  // Tallas y contacto de emergencia: se guardan en su ficha para la próxima.
  const cambiosBuzo = {};
  const tallas = body.tallas || {};
  if ((tallas.bcd && !b.tallas?.bcd) || (tallas.chapaletas && !b.tallas?.chapaletas)) {
    cambiosBuzo.tallas = { ...(b.tallas || {}), bcd: b.tallas?.bcd || String(tallas.bcd || "").slice(0, 10), chapaletas: b.tallas?.chapaletas || String(tallas.chapaletas || "").slice(0, 10) };
  }
  if (body.respuestas?.emergencia && !b.emergencia) cambiosBuzo.emergencia = String(body.respuestas.emergencia).slice(0, 120);
  if (Object.keys(cambiosBuzo).length) await s.from("viajes_buzos").update(buzoAFila(cambiosBuzo)).eq("id", b.id);

  const { data: ya } = await s.from("viajes_inscripciones").select("id, estado").eq("viaje_id", v.id).eq("buzo_id", b.id).maybeSingle();
  if (ya && ya.estado !== "quitado") return NextResponse.json({ ok: true, ya: true, nombre: primerNombre(b.nombre) });

  const { count } = await s
    .from("viajes_inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("viaje_id", v.id)
    .eq("estado", "inscrito")
    .neq("rol", "staff");
  const enEspera = (count || 0) >= (v.cupoMax || 0);

  let inscritoPor = null;
  if (body.inscritoPorDoc) {
    const quien = await buscarPorDoc(s, body.inscritoPorTipo === "pasaporte" ? "pasaporte" : "cedula", body.inscritoPorDoc);
    if (quien && quien.id !== b.id) inscritoPor = quien;
  }

  const permitidas = new Set(v.preguntas || []);
  const respuestas = Object.fromEntries(
    Object.entries(body.respuestas || {})
      .filter(([k]) => permitidas.has(k) && PREGUNTAS.some((q) => q.k === k))
      .map(([k, val]) => [k, String(val).slice(0, 120)])
  );
  const piezasOk = new Set(v.equipo?.piezas || []);
  const codigo = `${(v.nombre || "VIA").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}`;
  const fila = {
    viaje_id: v.id,
    buzo_id: b.id,
    opcion_id: o.id,
    rol: "buzo",
    equipo: {
      piezas: (body.piezas || []).filter((x) => piezasOk.has(x)),
      donde: ["gus", "alla", "propio"].includes(body.donde) ? body.donde : "",
    },
    extras: (body.extras || []).filter((id) => (v.extras || []).some((e) => e.id === id)),
    respuestas,
    estado: enEspera ? "espera" : "inscrito",
    grupo: false,
    pagos: [],
    nuevo: true,
    inscrito_por: inscritoPor?.id || null,
    via: "link",
    codigo,
    nota: "",
    habitacion: "",
    asistio: null,
  };
  const { error } = ya
    ? await s.from("viajes_inscripciones").update(fila).eq("id", ya.id)
    : await s.from("viajes_inscripciones").insert(fila);
  if (error) return NextResponse.json({ error: "No se pudo inscribir. Intenta de nuevo." }, { status: 500 });

  await s.from("viajes_bitacora").insert({
    viaje_id: v.id,
    quien: "Link",
    texto: `Se inscribió por el link: ${b.nombre}${nuevo ? " (nuevo)" : ""}${inscritoPor ? ` (la inscribió ${nombreCorto(inscritoPor.nombre)})` : ""}${enEspera ? " · lista de espera" : ""}`,
  });

  // V44: avisos (en el app, correo y celular, según lo que escogió el Titular).
  const origen = new URL(request.url).origin;
  const ruta = `/viajes-buceos/viaje/${v.id}`;
  await avisar(
    s,
    "inscripcion",
    {
      titulo: `${enEspera ? "Lista de espera" : "Nueva inscripción"} · ${v.nombre}`,
      texto: `${b.nombre} se inscribió (${o.nombre}) para el ${fechaCorta(v.fecha)}${enEspera ? " y quedó en lista de espera" : ""}${inscritoPor ? `. La inscribió ${nombreCorto(inscritoPor.nombre)}` : ""}.`,
      viajeId: v.id,
      ruta,
    },
    origen
  );
  if (!enEspera && (count || 0) + 1 === v.cupoMax) {
    await avisar(
      s,
      "lleno",
      { titulo: `Se llenó ${v.nombre}`, texto: `Llegó a ${v.cupoMax} buzos (${fechaCorta(v.fecha)}). Los próximos que se inscriban quedan en lista de espera.`, viajeId: v.id, ruta },
      origen
    );
  }

  return NextResponse.json({ ok: true, nombre: primerNombre(b.nombre), nombreCompleto: b.nombre, enEspera, codigo });
}
