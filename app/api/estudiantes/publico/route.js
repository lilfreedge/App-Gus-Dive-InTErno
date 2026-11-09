import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buzoAFila, filaABuzo, nuevoId } from "@/lib/viajes/datos";
import { filaACurso, filaAEst } from "@/lib/estudiantes/datos";
import { celOculto, nombreCorto, primerNombre, soloDigitos, formatoCedula, formatoCel, hoyISO, fechaLarga } from "@/lib/viajes/modelo";
import { pasosIniciales, pagado, debe, nombreEtapa, menorDe12 } from "@/lib/estudiantes/modelo";
import { docValido, buscarPorDoc, celCoincide, logLink, edadHoy, tokenMenor } from "@/lib/estudiantes/servidor";
import { avisarEquipoEst } from "@/lib/estudiantes/avisar";

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

  if (body.accion === "doc") {
    if (!b || b.staff) return NextResponse.json({ encontrado: false });
    return NextResponse.json({
      encontrado: true,
      corto: nombreCorto(b.nombre),
      primer: primerNombre(b.nombre),
      cel: celOculto(b.cel),
      tieneCel: soloDigitos(b.cel).length === 10,
      // Lo que nos falta de su ficha, para pedirle solo eso.
      falta: { nac: !b.nac, direccion: !b.direccion, emergencia: !b.emergencia, correo: !b.correo, foto: !b.foto, cedula: !b.docFoto },
    });
  }

  if (body.accion === "estado") {
    if (!b || !celCoincide(b, body.cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
    const { data } = await s.from("est_estudiantes").select("*").eq("buzo_id", b.id).order("creado_en", { ascending: false });
    return NextResponse.json({ primer: primerNombre(b.nombre), estudios: (data || []).map(filaAEst).filter((e) => e.estado !== "cancelado").map(resumen), falta: { foto: !b.foto, cedula: !b.docFoto } });
  }

  if (body.accion !== "registrar") return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });

  // ------------------------------------------------------------ registrar
  const { data: cfila } = await s.from("est_cursos").select("*").eq("id", String(body.cursoId || "")).maybeSingle();
  const curso = cfila ? filaACurso(cfila) : null;
  if (!curso || !curso.activo) return NextResponse.json({ error: "Escoge el curso." }, { status: 400 });
  const n = body.datos || {};
  // V60 (nota 2-nov): el buceo es de 12 años en adelante.
  if (menorDe12(n.nac)) return NextResponse.json({ error: "Para bucear hay que tener 12 años o más." }, { status: 400 });
  const cel = soloDigitos(body.cel);
  if (cel.length !== 10) return NextResponse.json({ error: "Escribe tu celular completo (10 números)." }, { status: 400 });

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
    if (b && soloDigitos(b.cel).length === 10 && !celCoincide(b, cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
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
    if (soloDigitos(buzo.cel).length === 10 && !celCoincide(buzo, cel)) return NextResponse.json({ error: "Ese celular no es el que tenemos con esa cédula. Escríbenos por WhatsApp." }, { status: 400 });
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
  const cuando = fecha ? ` · ${fechaLarga(fecha.inicio)}` : espera ? (pidioLlena ? " · lista de espera (la fecha estaba llena)" : " · lista de espera") : "";
  await logLink(s, fila.id, `Se registró por el link: ${buzo.nombre} (${curso.nombre}${cuando})${tutorTxt ? ` · menor de edad, lo registró ${tutorTxt}` : ""}`);
  // V54: aviso en la campanita ("62. si").
  await avisarEquipoEst(s, { permiso: "estudiantes", titulo: espera ? "Nuevo en lista de espera (link)" : "Nuevo estudiante por el link", texto: `${buzo.nombre}${tutorTxt ? ` (menor, lo registró ${tutorTxt})` : ""} · ${curso.nombre}${fecha ? ` · ${fechaLarga(fecha.inicio)}` : ""}`, url: `/control-estudiantes/estudiante/${fila.id}` });
  return NextResponse.json({ ok: true, primer: primerNombre(buzo.nombre), estudianteId: fila.id, curso: curso.nombre, precio: curso.precio, fecha: fecha ? fecha.inicio : null, espera, llena: pidioLlena, semana: fecha ? curso.semana || null : null, ...permisoMenor });
}
