import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buzoAFila, filaABuzo, nuevoId } from "@/lib/viajes/datos";
import { filaACurso, filaAEst } from "@/lib/estudiantes/datos";
import { celOculto, nombreCorto, primerNombre, soloDigitos, formatoCedula, formatoCel, hoyISO, fechaLarga, celValido, celGuardar } from "@/lib/viajes/modelo";
import { pasosIniciales, pagado, debe, nombreEtapa, menorDe12, avance, faltaDe } from "@/lib/estudiantes/modelo";
import { docValido, buscarPorDoc, celCoincide, logLink, edadHoy, tokenMenor, puedeCambiarArchivo, puedeCambiarCel, cambiarCelular } from "@/lib/estudiantes/servidor";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";
import { cedulaValida, MSG_CEDULA_MALA } from "@/lib/viajes/modelo";
import { mandarListaEspera } from "@/lib/correo-lista-espera";
const TIENDA_WA = process.env.VIAJES_WHATSAPP_TIENDA || "8095660818";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Control Estudiantes -- lo que hace el link de registro del estudiante
// (maqueta-control-estudiantes-2, pestaña 5, opción D: "52. quiero ver eso a
// ver y te digo").
//   accion "doc"        -> ¿esta cédula/pasaporte ya está en la base? (de Buceos o de antes)
//   accion "registrar"  -> lo registra en un curso (y como buzo, si es nuevo)
//   accion "estado"     -> cómo va su curso (pide también su celular)

const resumen = (e) => ({
  id: e.id,
  curso: e.curso,
  escuela: e.escuela,
  fechaInicio: e.fechaInicio,
  estado: e.estado,
  etapa: nombreEtapa(e.estado),
  precio: e.precio,
  pagado: pagado(e),
  debe: debe(e),
  comprobantes: (e.comprobantes || []).length,
  firmado: !!e.firma,
});

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const s = createServiceClient();
  const tipo = body.tipoDoc === "pasaporte" ? "pasaporte" : "cedula";
  if (!docValido(tipo, body.doc)) return NextResponse.json({ error: tipo === "cedula" ? "La cédula tiene 11 números." : "Escribe tu pasaporte completo." }, { status: 400 });
  const b = await buscarPorDoc(s, tipo, body.doc);
  // V68 ("13. B"): una cédula que no pasa la prueba no deja seguir (si la persona ya está en la base, sí).
  if (tipo === "cedula" && !b && !cedulaValida(body.doc)) return NextResponse.json({ error: MSG_CEDULA_MALA }, { status: 400 });

  if (body.accion === "doc") {
    if (!b || b.staff) return NextResponse.json({ encontrado: false });
    return NextResponse.json({
      encontrado: true,
      corto: nombreCorto(b.nombre),
      primer: primerNombre(b.nombre),
      // V64 ("278. A"): el nombre completo, con el final del celular.
      nombre: b.nombre,
      cel: celOculto(b.cel),
      tieneCel: celValido(b.cel),
      // Lo que nos falta de su ficha, para pedirle solo eso.
      falta: { nac: !b.nac, direccion: !b.direccion, emergencia: !b.emergencia, correo: !b.correo, foto: !b.foto, cedula: !b.docFoto },
    });
  }

  if (body.accion === "estado") {
    if (!b || !celCoincide(b, body.cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const { data } = await s.from("est_estudiantes").select("*").eq("buzo_id", b.id).order("creado_en", { ascending: false });
    const ests = (data || []).map(filaAEst).filter((e) => e.estado !== "cancelado");
    // V63 ("162", "Mis documentos"): sus datos (los puede cambiar), cómo va en
    // cada curso (los pagos adentro), y si ya puede cambiar la foto y la firma
    // (cada 6 meses). Solo después de confirmar con su celular.
    const ids = [...new Set(ests.map((e) => e.cursoId).filter(Boolean))];
    const { data: cfilas } = ids.length ? await s.from("est_cursos").select("*").in("id", ids) : { data: [] };
    const cursos = Object.fromEntries((cfilas || []).map((c) => [c.id, filaACurso(c)]));
    const foto = puedeCambiarArchivo(b.foto);
    const estudios = ests.map((e) => {
      const c = cursos[e.cursoId] || null;
      const a = avance(e, c);
      const firma = puedeCambiarArchivo(e.firma);
      return { ...resumen(e), avance: { hechos: a.hechos, total: a.total, pct: a.pct }, falta: e.estado === "curso" ? faltaDe(e, c) : [], firma: { hay: !!e.firma, puede: firma.puede, desde: firma.desdeCuando || null } };
    });
    // Los menores que esta persona registró (solo cómo van).
    const { data: menoresF } = await s.from("viajes_buzos").select("*").eq("celular", soloDigitos(b.cel)).not("tutor", "is", null);
    const menores = [];
    for (const m of (menoresF || []).map(filaABuzo).filter((x) => x.id !== b.id)) {
      const { data: me } = await s.from("est_estudiantes").select("*").eq("buzo_id", m.id).order("creado_en", { ascending: false });
      menores.push({ primer: primerNombre(m.nombre), estudios: (me || []).map(filaAEst).filter((e) => e.estado !== "cancelado").map(resumen) });
    }
    return NextResponse.json({
      primer: primerNombre(b.nombre),
      estudios,
      falta: { foto: !b.foto, cedula: !b.docFoto },
      datos: { nombre: b.nombre, cel: celOculto(b.cel), correo: b.correo || "", direccion: b.direccion || "", emergencia: b.emergencia || "", nac: b.nac || "" },
      foto: { hay: !!b.foto, puede: foto.puede, desde: foto.desdeCuando || null },
      menores,
      // V64 ("279"): si ya puede cambiar su celular (una vez al mes).
      celCambio: (() => {
        const pc = puedeCambiarCel(b);
        return pc.puede ? { puede: true } : { puede: false, desde: pc.desde };
      })(),
    });
  }

  // V64 ("279"): cambiar su celular desde "Mis documentos" (una vez al mes).
  if (body.accion === "cel-cambiar") {
    if (!b || !celCoincide(b, body.cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const r = await cambiarCelular(s, b, body.nuevo, body.otraVez);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
    await logLink(s, null, `Cambió su celular por el link: ${b.nombre}`, `${formatoCel(r.viejo)} → ${formatoCel(r.nuevo)}`);
    await avisarEquipoEst(s, { permiso: "estudiantes", titulo: "Cambió su celular (link)", texto: `${b.nombre}: antes ${formatoCel(r.viejo)}, ahora ${formatoCel(r.nuevo)}`, url: "/control-estudiantes/estudiantes" });
    return NextResponse.json({ ok: true, cel: celOculto(r.nuevo) });
  }

  // V63 ("162"): cambiar sus datos desde "Mis documentos" (correo, dirección y
  // contacto de emergencia). El nombre, la cédula y el celular, por WhatsApp.
  if (body.accion === "datos") {
    if (!b || !celCoincide(b, body.cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const n = body.datos || {};
    const cambios = {};
    if ("correo" in n) cambios.correo = String(n.correo || "").trim().slice(0, 120);
    if ("direccion" in n) cambios.direccion = String(n.direccion || "").trim().slice(0, 200);
    if ("emergencia" in n) cambios.emergencia = String(n.emergencia || "").trim().slice(0, 200);
    if (cambios.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cambios.correo)) return NextResponse.json({ error: "Ese correo no se ve bien." }, { status: 400 });
    if (!Object.keys(cambios).length) return NextResponse.json({ ok: true });
    const { error } = await s.from("viajes_buzos").update(buzoAFila(cambios)).eq("id", b.id);
    if (error) return NextResponse.json({ error: "No se pudo guardar. Intenta de nuevo." }, { status: 500 });
    await logLink(s, null, `Cambió sus datos por el link: ${b.nombre}`, Object.keys(cambios).join(", "));
    return NextResponse.json({ ok: true });
  }

  if (body.accion !== "registrar") return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });

  // ------------------------------------------------------------ registrar
  const { data: cfila } = await s.from("est_cursos").select("*").eq("id", String(body.cursoId || "")).maybeSingle();
  const curso = cfila ? filaACurso(cfila) : null;
  if (!curso || !curso.activo) return NextResponse.json({ error: "Escoge el curso." }, { status: 400 });
  const n = body.datos || {};
  // V60 (nota 2-nov): el buceo es de 12 años en adelante.
  if (menorDe12(n.nac)) return NextResponse.json({ error: "Para bucear hay que tener 12 años o más." }, { status: 400 });
  // V65 ("284"): también celulares de otros países.
  const cel = celGuardar(body.cel);
  if (!celValido(body.cel)) return NextResponse.json({ error: "Escribe tu celular completo." }, { status: 400 });

  let buzo = b;
  // V62 ("229. si", maqueta V61): un adulto registra a un menor de edad (12 a
  // 17 años). El documento y el celular son los del adulto; el menor se crea
  // con el celular del adulto, y queda anotado quién lo registró.
  let tutorTxt = "";
  if (body.menor) {
    const m = body.menor || {};
    const nombreM = String(m.nombre || "").trim().slice(0, 120);
    if (!nombreM) return NextResponse.json({ error: "Falta el nombre del menor." }, { status: 400 });
    const edad = edadHoy(String(m.nac || "").slice(0, 10));
    if (edad == null) return NextResponse.json({ error: "Falta la fecha de nacimiento del menor." }, { status: 400 });
    if (edad < 12) return NextResponse.json({ error: "El buceo es de 12 años en adelante." }, { status: 400 });
    if (edad >= 18) return NextResponse.json({ error: "Si tiene 18 años o más, que se registre con su propio documento." }, { status: 400 });
    if (b && celValido(b.cel) && !celCoincide(b, cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const tutorNombre = b ? b.nombre : String(body.tutorNombre || "").trim().slice(0, 120);
    if (!tutorNombre) return NextResponse.json({ error: "Falta tu nombre completo." }, { status: 400 });
    const parentesco = ["Mamá", "Papá", "Tutor"].includes(m.parentesco) ? m.parentesco : "Tutor";
    const docT = tipo === "cedula" ? formatoCedula(body.doc) : String(body.doc || "").toUpperCase().replace(/\s/g, "");
    const tutor = { nombre: tutorNombre, parentesco, cel, tipoDoc: tipo, doc: docT, buzoId: b?.id || null, en: new Date().toISOString() };
    tutorTxt = `${tutorNombre} (${parentesco.toLowerCase()})`;
    // Si ya lo habían registrado (mismo nombre, misma fecha y el celular del adulto), se usa esa ficha.
    const { data: mismos } = await s.from("viajes_buzos").select("*").eq("fecha_nacimiento", String(m.nac).slice(0, 10)).eq("celular", cel);
    const ya = (mismos || []).map(filaABuzo).find((x) => String(x.nombre || "").trim().toLowerCase() === nombreM.toLowerCase());
    if (ya) buzo = ya;
    else {
      buzo = {
        id: nuevoId(),
        nombre: nombreM,
        doc: "",
        pasaporte: "",
        cel,
        correo: String(n.correo || "").trim().slice(0, 120),
        nac: String(m.nac).slice(0, 10),
        direccion: String(n.direccion || "").trim().slice(0, 200),
        emergencia: `${tutorNombre} (${parentesco.toLowerCase()}) · ${formatoCel(cel)}`,
        tallas: {},
        abono: 0,
        staff: false,
        tutor,
      };
      let { error } = await s.from("viajes_buzos").insert(buzoAFila(buzo));
      if (error) {
        // Sin migration_89 todavía: quién lo registró va en la nota de su ficha.
        const { tutor: _t, ...sin } = buzo;
        ({ error } = await s.from("viajes_buzos").insert({ ...buzoAFila(sin), notas: `Menor de edad. Lo registró ${tutorTxt}, ${tipo === "cedula" ? "cédula" : "documento"} ${docT}, cel. ${formatoCel(cel)}.` }));
      }
      if (error) return NextResponse.json({ error: "No se pudieron guardar los datos. Intenta de nuevo." }, { status: 500 });
    }
  } else if (buzo) {
    // Ya está en la base: tiene que poner el mismo celular. Solo se llena lo
    // que no teníamos; nunca se cambia lo que ya estaba.
    if (celValido(buzo.cel) && !celCoincide(buzo, cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const llenar = {};
    if (!buzo.cel) llenar.cel = cel;
    if (!buzo.nac && n.nac) llenar.nac = String(n.nac).slice(0, 10);
    if (!buzo.direccion && n.direccion) llenar.direccion = String(n.direccion).trim().slice(0, 200);
    if (!buzo.emergencia && n.emergencia) llenar.emergencia = String(n.emergencia).trim().slice(0, 200);
    if (!buzo.correo && n.correo) llenar.correo = String(n.correo).trim().slice(0, 120);
    if (!buzo.nacionalidad && n.nacionalidad && tipo === "pasaporte") llenar.nacionalidad = String(n.nacionalidad).trim().slice(0, 60);
    if (Object.keys(llenar).length) {
      const { error: eLl } = await s.from("viajes_buzos").update(buzoAFila(llenar)).eq("id", buzo.id);
      // Sin migration_85 todavía: se guarda lo demás.
      if (eLl && "nacionalidad" in llenar) {
        delete llenar.nacionalidad;
        if (Object.keys(llenar).length) await s.from("viajes_buzos").update(buzoAFila(llenar)).eq("id", buzo.id);
      }
    }
  } else {
    if (!String(n.nombre || "").trim()) return NextResponse.json({ error: "Falta tu nombre completo." }, { status: 400 });
    if (!n.nac) return NextResponse.json({ error: "Falta tu fecha de nacimiento." }, { status: 400 });
    buzo = {
      id: nuevoId(),
      nombre: String(n.nombre).trim().slice(0, 120),
      doc: tipo === "cedula" ? formatoCedula(body.doc) : "",
      pasaporte: tipo === "pasaporte" ? body.doc : "",
      cel,
      correo: String(n.correo || "").trim().slice(0, 120),
      nac: String(n.nac).slice(0, 10),
      direccion: String(n.direccion || "").trim().slice(0, 200),
      emergencia: String(n.emergencia || "").trim().slice(0, 200),
      tallas: {},
      abono: 0,
      staff: false,
      ...(tipo === "pasaporte" && n.nacionalidad ? { nacionalidad: String(n.nacionalidad).trim().slice(0, 60) } : {}),
    };
    let { error } = await s.from("viajes_buzos").insert(buzoAFila(buzo));
    if (error && buzo.nacionalidad) {
      // Sin migration_85 todavía: se guarda sin la nacionalidad.
      const { nacionalidad, ...sin } = buzo;
      ({ error } = await s.from("viajes_buzos").insert(buzoAFila(sin)));
    }
    if (error) return NextResponse.json({ error: "No se pudieron guardar tus datos. Intenta de nuevo." }, { status: 500 });
  }

  // Si ya tiene ese mismo curso abierto, no se repite.
  const { data: abiertos } = await s.from("est_estudiantes").select("*").eq("buzo_id", buzo.id).eq("curso_id", curso.id).not("estado", "in", "(entregada,avisado,cancelado)");
  const permisoMenor = body.menor ? { menor: true, buzoId: buzo.id, token: tokenMenor(buzo.id) } : {};
  if (abiertos?.length) return NextResponse.json({ ok: true, ya: true, primer: primerNombre(buzo.nombre), estudianteId: abiertos[0].id, curso: curso.nombre, ...permisoMenor });

  // V55: la fecha que escogió ("64", "71. B"). Si está llena o el curso no
  // tiene fecha, queda en lista de espera ("65").
  let fecha = null;
  let espera = !!body.espera;
  let pidioLlena = false;
  if (body.fechaId) {
    const { data: fr } = await s.from("est_fechas").select("*").eq("id", String(body.fechaId)).maybeSingle();
    if (!fr || fr.curso_id !== curso.id || fr.activo === false || fr.inicio < hoyISO()) return NextResponse.json({ error: "Esa fecha ya no está disponible. Escoge otra." }, { status: 400 });
    if (fr.cupo != null) {
      const { count } = await s.from("est_estudiantes").select("id", { count: "exact", head: true }).eq("fecha_id", fr.id).neq("estado", "cancelado");
      if ((count || 0) >= fr.cupo) {
        espera = true;
        pidioLlena = true;
      }
    }
    if (!espera) fecha = fr;
  }

  const pasos = pasosIniciales(curso);
  if (buzo.foto && pasos.foto === "pendiente") pasos.foto = "listo";
  if (buzo.docFoto && pasos.identificacion === "pendiente") pasos.identificacion = "listo";
  const fila = {
    id: nuevoId(),
    buzo_id: buzo.id,
    curso_id: curso.id,
    curso: curso.nombre,
    escuela: curso.escuelas?.[0] || null,
    fecha_inicio: fecha ? fecha.inicio : !espera && /^\d{4}-\d{2}-\d{2}$/.test(String(body.fechaInicio || "")) ? body.fechaInicio : null,
    ...(fecha ? { fecha_id: fecha.id } : {}),
    buceos_previos: body.buceos === "" || body.buceos == null ? null : Math.max(0, Math.min(9999, parseInt(body.buceos, 10) || 0)),
    pasos,
    examen: curso.llevaExamen ? "pendiente" : "na",
    precio: curso.precio,
    estado: espera ? "espera" : "curso",
    via: "link",
  };
  const { error: eEst } = await s.from("est_estudiantes").insert(fila);
  if (eEst) return NextResponse.json({ error: "No se pudo registrar el curso. Intenta de nuevo." }, { status: 500 });
  // V65 ("286"): "Agregar Nitrox" en Open Water (o "Agregar OXY" en BLS):
  // queda anotado también en ese curso, sin fecha (en lista de espera).
  let tambienNombre = null;
  if (body.tambien && String(body.tambien) !== curso.id) {
    const { data: tf } = await s.from("est_cursos").select("*").eq("id", String(body.tambien)).maybeSingle();
    const t = tf ? filaACurso(tf) : null;
    if (t && t.activo) {
      const { data: yaT } = await s.from("est_estudiantes").select("id").eq("buzo_id", buzo.id).eq("curso_id", t.id).not("estado", "in", "(entregada,avisado,cancelado)");
      if (!yaT?.length) {
        const pasosT = pasosIniciales(t);
        if (buzo.foto && pasosT.foto === "pendiente") pasosT.foto = "listo";
        if (buzo.docFoto && pasosT.identificacion === "pendiente") pasosT.identificacion = "listo";
        const filaT = { id: nuevoId(), buzo_id: buzo.id, curso_id: t.id, curso: t.nombre, escuela: t.escuelas?.[0] || null, fecha_inicio: null, pasos: pasosT, examen: t.llevaExamen ? "pendiente" : "na", precio: t.precio, estado: "espera", via: "link" };
        const { error: eT } = await s.from("est_estudiantes").insert(filaT);
        if (!eT) {
          tambienNombre = t.nombre;
          await logLink(s, filaT.id, `Se registró por el link: ${buzo.nombre} (${t.nombre}, junto con ${curso.nombre})`);
        }
      }
    }
  }
  const cuando = fecha ? ` · ${fechaLarga(fecha.inicio)}` : espera ? (pidioLlena ? " · lista de espera (la fecha estaba llena)" : " · lista de espera") : "";
  await logLink(s, fila.id, `Se registró por el link: ${buzo.nombre} (${curso.nombre}${cuando})${tutorTxt ? ` · menor de edad, lo registró ${tutorTxt}` : ""}`);
  // V68 ("15"): correo de lista de espera, si dejó su correo. En su ficha sale que se le mandó.
  if (espera && !tutorTxt) {
    const correo = buzo.correo || String(body.datos?.correo || "").trim();
    if (await mandarListaEspera({ correo, nombre: primerNombre(buzo.nombre), que: curso.nombre, whatsapp: TIENDA_WA })) {
      await s.from("est_estudiantes").update({ etapas: { correo_espera: { en: new Date().toISOString(), por: "Link" } } }).eq("id", fila.id);
      await logLink(s, fila.id, `Se le mandó el correo de lista de espera (${curso.nombre})`);
    }
  }
  // V54: aviso en la campanita ("62. si").
  await avisarEquipoEst(s, { permiso: "estudiantes", titulo: espera ? "Nuevo en lista de espera (link)" : "Nuevo estudiante por el link", texto: `${buzo.nombre}${tutorTxt ? ` (menor, lo registró ${tutorTxt})` : ""} · ${curso.nombre}${fecha ? ` · ${fechaLarga(fecha.inicio)}` : ""}`, url: `/control-estudiantes/estudiante/${fila.id}` });
  return NextResponse.json({ ok: true, primer: primerNombre(buzo.nombre), estudianteId: fila.id, curso: curso.nombre, precio: curso.precio, fecha: fecha ? fecha.inicio : null, espera, llena: pidioLlena, semana: fecha ? curso.semana || null : null, tambien: tambienNombre, ...permisoMenor });
}
