"use client";

import { useState } from "react";
import { Buscar, CampoCel, IconoWA, Modal } from "@/components/viajes/Piezas";
import { IconPlus, IconEdit } from "@/components/icons";
import { FUENTES, linkWhatsApp, hoyISO, fechaCorta, fechaDeIso, soloDigitos, fechaCursoCorta, fechasDe } from "@/lib/estudiantes/modelo";
import FechaNacimiento from "@/components/FechaNacimiento";
import { formatoCel } from "@/lib/viajes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import CompartirLink, { urlCompleta } from "@/components/CompartirLink";
import { cursoDe } from "./Inicio";

// Interesados (1-nov-2026: "Me interesa poder tener un listado de
// interesados también"): los que preguntan por un curso y todavía no se
// inscriben. "Inscribir" los pasa a Estudiantes.
const VACIO = { nombre: "", cel: "", curso: "", cuando: "", fuente: "Instagram", nota: "", recordar: "", seguimiento: [] };

// V62 ("245. ok", maqueta V62): un seguimiento como el de los Holds y el de
// las fichas. Cada interesado tiene su historia (qué le dijiste, qué te dijo y
// cuándo volver a escribirle). El estado se pone solo según lo último que se
// anota.
export const TIPOS_SEG_INT = [
  { k: "escribi", t: "Le escribí", estado: "escribimos" },
  { k: "no_contesta", t: "No contesta", estado: "escribimos" },
  // V76 (pedido explícito, con foto: botón "Enviar Link de curso a
  // estudiante" -- se anota solo cuando se usa ese botón).
  { k: "link_curso", t: "Le envié el link para inscribirse", estado: "va" },
  { k: "va", t: "Va a inscribirse", estado: "va" },
  { k: "otra_fecha", t: "Quiere otra fecha", estado: "escribimos" },
  { k: "no", t: "No le interesa", estado: "no" },
];
const tipoSeg = (k) => TIPOS_SEG_INT.find((x) => x.k === k) || { k, t: k === "nota" ? "Nota" : k === "inscrito" ? "Se inscribió" : "Anotó" };
const cuandoFue = (iso) => {
  if (!iso) return "";
  // La hora guardada es UTC; aquí se pasa a la hora de RD (UTC-4).
  const t = new Date(iso).getTime();
  const d = isNaN(t) ? String(iso).slice(0, 10) : new Date(t - 4 * 3600 * 1000).toISOString().slice(0, 10);
  const h = hoyISO();
  const ayer = new Date(new Date(h + "T12:00:00").getTime() - 86400000).toISOString().slice(0, 10);
  return d === h ? "hoy" : d === ayer ? "ayer" : fechaCorta(d);
};
// La historia completa, la más nueva arriba. La primera línea (cómo llegó) y
// la nota vieja (de antes del seguimiento) salen aunque no estén guardadas.
export function historiaInteresado(x) {
  const lista = [...(x.seguimiento || [])].sort((a, b) => String(b.en || "").localeCompare(String(a.en || "")));
  const base = [];
  if (x.nota) base.push({ id: "nota", tipo: "nota", texto: x.nota, en: x.creadoEn, fija: true });
  base.push({ id: "llego", tipo: "llego", t: x.via === "link" ? "Se anotó por el link" : "Lo agregaron a mano", en: x.creadoEn, fija: true });
  const arriba = x.estado === "inscrito" && !lista.some((h) => h.tipo === "inscrito") ? [{ id: "inscrito", tipo: "inscrito", t: "Se inscribió", fija: true }] : [];
  return [...arriba, ...lista, ...base];
}
const ultimo = (x) => [...(x.seguimiento || [])].sort((a, b) => String(b.en || "").localeCompare(String(a.en || "")))[0] || null;

export function Interesados({ db, p, yo, ops, ir, avisar }) {
  // V76 (maqueta V74 aprobada: "recuerda que vamos a reemplazar esta
  // parte... aprobé maqueta y todo") -- se quita el filtro por estado
  // (Nuevos/Le escribimos/etc.) y se filtra por curso en su lugar. Sin
  // ningún curso tocado se ven todos los interesados, de cualquier
  // estado; lo que pasó con cada uno se sigue viendo en su tarjeta.
  const [filtroCurso, setFiltroCurso] = useState(null);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const t = q.trim().toLowerCase();
  const td = soloDigitos(q);
  const hoy = hoyISO();
  const cursosConInteresados = [...new Set(db.interesados.map((x) => x.curso).filter(Boolean))].map((c) => ({ c, n: db.interesados.filter((x) => x.curso === c).length }));
  const lista = db.interesados
    .filter((x) => (t ? (x.nombre || "").toLowerCase().includes(t) || (td.length >= 4 && soloDigitos(x.cel).includes(td)) : filtroCurso ? x.curso === filtroCurso : true))
    .sort((a, b) => (a.recordar && a.recordar <= hoy ? -1 : 0) - (b.recordar && b.recordar <= hoy ? -1 : 0));
  const cursos = db.cursos.filter((c) => c.activo).map((c) => c.nombre);

  function guardarNuevo() {
    if (!nuevo.nombre.trim()) return avisar("Falta el nombre.");
    const x = { ...nuevo, id: nuevoId(), nombre: nuevo.nombre.trim(), cel: soloDigitos(nuevo.cel), estado: "nuevo", via: "mano", creadoEn: new Date().toISOString() };
    ops.guardarInteresado(x, true, `Agregó un interesado: ${x.nombre}${x.curso ? ` (${x.curso})` : ""}`);
    setNuevo(null);
    setFiltroCurso(null);
    setQ("");
  }

  return (
    <>
      {/* V76 (pedido explícito, con foto: "pon los botones en interesados
          asi como estan en cursos") -- título y botones en la misma fila,
          como en "Cursos abiertos". */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Interesados
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-primary vj-btn" onClick={() => setNuevo({ ...VACIO, curso: cursos[0] || "" })}>
            <IconPlus size={16} /> Agregar interesado
          </button>
          {/* V62 ("249"): "Lo mismo para Me interesa". V74 (pedido
              explícito, con foto: cambiar el nombre del botón y el mensaje
              de WhatsApp). */}
          <CompartirLink ruta="/me-interesa" etiqueta="Compartir link de interesados" mensaje="Hola, aquí te dejo el link para que te anotes como interesado en nuestros cursos:" tituloQr="Registro de interesado" avisar={avisar} />
        </div>
      </div>
      {nuevo && (
        <div className="ce-etapa">
          <h4>Nuevo interesado</h4>
          <FormInteresado f={nuevo} setF={setNuevo} cursos={cursos} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary vj-btn" onClick={guardarNuevo}>
              Guardar
            </button>
            <button className="btn secondary vj-btn" onClick={() => setNuevo(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <div className="vj-filtros">
        {cursosConInteresados.map(({ c, n }) => (
          <button key={c} className={`vj-filtro ce-filtro${filtroCurso === c && !t ? " sel" : ""}`} onClick={() => (setFiltroCurso(filtroCurso === c ? null : c), setQ(""))}>
            {c} <span>{n}</span>
          </button>
        ))}
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Buscar por nombre o celular…" />
      {lista.map((x) => {
        const u = ultimo(x);
        return (
          <div key={x.id} className="ce-est" role="button" tabIndex={0} onClick={() => setAbierto(x)}>
            <div className="ce-est-t">
              <b>{x.nombre}</b>
              {x.curso && <span className="ce-chip curso">{x.curso}</span>}
              {/* V60 ("164"): si ya lo teníamos en el sistema (de Viajes y
                  Buceos o de otro registro), por su cédula o pasaporte. V76
                  (pedido explícito, con foto: "por que sale ese ya es buzo
                  de gus? no hace sentido, porque ese estudiante aun no ha
                  concluido ningun curso con nosotros") -- decía "Ya es
                  buzo de Gus", pero solo significa que ya teníamos su
                  perfil (no que haya completado un curso); se cambia el
                  texto para que no confunda. */}
              {x.buzoId && <span className="ce-chip">Ya lo teníamos registrado</span>}
            </div>
            {/* V62 ("245"): en la lista se ve lo último que pasó. V74
                (pedido explícito, con foto: "Esto es un interesado, Quita
                esto: Nuevo, nadie le ha escrito · por el link · 12 nov") --
                para un interesado nuevo (sin seguimiento todavía) ya no se
                muestra esta línea. Si ya tiene seguimiento, se sigue viendo
                lo último que pasó, igual que antes. */}
            {u && (
              <div className="ce-est-m ce-int-ult">
                {[`Último: "${tipoSeg(u.tipo).t}"`, u.quien, cuandoFue(u.en)].filter(Boolean).join(" · ") + (u.texto ? ` · ${u.texto}` : "")}
              </div>
            )}
            {x.recordar && !["inscrito", "no"].includes(x.estado) && (
              <div className={`ce-est-m${x.recordar <= hoy ? " ce-recordar" : ""}`}>{x.recordar <= hoy ? "Escribirle de nuevo hoy" : `Escribirle de nuevo el ${fechaCursoCorta(x.recordar)}`}</div>
            )}
            {/* V75 (pedido explícito: "el boton de whatsapp e inscribir no
                parecen botones. arregla, e intercambialos de lugar") --
                Inscribir va primero ahora; los dos se ven más como botones
                de verdad (más grandes, con relleno) en vez de chips. */}
            {!["inscrito", "no"].includes(x.estado) && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                {p.estudiantes && (
                  <button className="btn vj-btn ce-int-insc" onClick={() => ir(`nuevo:${x.id}`)}>
                    Inscribir
                  </button>
                )}
                {x.cel && (
                  <button
                    className="btn vj-btn ce-wa"
                    onClick={() => {
                      window.open(linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`), "_blank", "noopener");
                      if (x.estado === "nuevo")
                        ops.guardarInteresado(
                          { ...x, estado: "escribimos", seguimiento: [...(x.seguimiento || []), { id: nuevoId(), tipo: "escribi", texto: "Por WhatsApp", quien: yo?.corto || "", en: new Date().toISOString() }] },
                          false,
                          `Le escribió a un interesado: ${x.nombre}`
                        );
                    }}
                  >
                    <IconoWA on /> WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!lista.length && <div className="card hint-text">{t ? "No hay nadie con esa búsqueda." : "No hay nadie aquí."}</div>}
      {abierto && <DetalleInteresado x={db.interesados.find((y) => y.id === abierto.id) || abierto} db={db} p={p} yo={yo} ops={ops} ir={ir} cursos={cursos} avisar={avisar} cerrar={() => setAbierto(null)} />}
    </>
  );
}

function FormInteresado({ f, setF, cursos, sinRecordar }) {
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="ce-form">
      <div className="ce-form-fila">
        <label>
          Nombre
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} autoFocus />
        </label>
        <label>
          Celular
          <CampoCel value={f.cel ? formatoCel(f.cel) : ""} onChange={(v) => set("cel", v)} />
        </label>
      </div>
      <div className="ce-form-fila">
        <label>
          Curso que le interesa
          <select value={f.curso} onChange={(e) => set("curso", e.target.value)}>
            <option value="">No sabe todavía</option>
            {cursos.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          ¿Cómo se enteró?
          <select value={f.fuente} onChange={(e) => set("fuente", e.target.value)}>
            {FUENTES.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
      </div>
      {/* V74 (pedido explícito, con foto: "borrar seccion de 'cuando
          quieres empezar'") -- se quita el campo; "Escribirle de nuevo el"
          se queda, ahora solo. */}
      {!sinRecordar && (
        <label>
          Escribirle de nuevo el
          <input type="date" value={f.recordar || ""} onChange={(e) => set("recordar", e.target.value)} />
        </label>
      )}
      <label>
        Nota
        <input value={f.nota} onChange={(e) => set("nota", e.target.value)} />
      </label>
    </div>
  );
}

// V62 ("245"): al tocar a alguien se abre su ficha con el seguimiento, en vez
// del formulario. Los datos se cambian con "Editar datos".
function DetalleInteresado({ x, db, p, yo, ops, ir, cursos, cerrar, avisar }) {
  const [editando, setEditando] = useState(false);
  const [f, setF] = useState(x);
  const [tipo, setTipo] = useState("");
  const [texto, setTexto] = useState("");
  // V57 -- "dame ese poder absoluto": el Titular puede borrar un interesado.
  const [borrando, setBorrando] = useState(false);
  const est = x.estudianteId ? db.estudiantes.find((e) => e.id === x.estudianteId) : null;
  const historia = historiaInteresado(x);
  const cerradoYa = x.estado === "inscrito";

  function anotar() {
    // V76 (pedido explícito, con foto: "quita la fecha") -- ya no se pone
    // la fecha para recordar desde aquí (eso se quitó); si quiere
    // recordatorio lo pone en "Editar datos". Si marca "No le interesa"
    // se sigue quitando el recordatorio que tuviera puesto.
    if (!tipo && !texto.trim()) return avisar("Escoge qué pasó o escribe algo.");
    const entrada = { id: nuevoId(), tipo: tipo || "nota", texto: texto.trim(), quien: yo?.corto || "", en: new Date().toISOString() };
    const nuevoEstado = tipo ? tipoSeg(tipo).estado : x.estado === "nuevo" ? "escribimos" : x.estado;
    const y = { ...x, seguimiento: [...(x.seguimiento || []), entrada], estado: cerradoYa ? x.estado : nuevoEstado, recordar: tipo === "no" ? "" : x.recordar };
    ops.guardarInteresado(y, false, `Seguimiento de un interesado: ${x.nombre} (${tipoSeg(entrada.tipo).t}${entrada.texto ? `: ${entrada.texto}` : ""})`);
    setTipo("");
    setTexto("");
  }

  // V76 (pedido explícito, con foto: "abajo de inscribir pongamos algo
  // como que 'Enviar Link de curso a estudiante'... que abra un mensaje
  // automatico en whatsapp... y que cuando el estudiante se inscriba en
  // el curso pues que se quite de interesados y figure en cursos") -- le
  // manda el link de registro (ya con la fecha más próxima del curso
  // escogida, si hay una abierta) por WhatsApp y lo anota en el
  // seguimiento. Cuando se registre con ese mismo celular, el link ya
  // sabe reconocerlo (V78) y, al inscribirse, pasa solo a Estudiantes.
  function enviarLinkCurso() {
    const curso = cursoDe(db, x);
    const fecha = curso ? fechasDe(db, curso.id, { soloFuturas: true })[0] : null;
    const link = urlCompleta(fecha ? `/estudiante?curso=${fecha.id}` : "/estudiante");
    window.open(linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, aquí tienes el link para inscribirte en ${x.curso || "el curso"}: ${link}`), "_blank", "noopener");
    ops.guardarInteresado(
      { ...x, estado: cerradoYa ? x.estado : "va", seguimiento: [...(x.seguimiento || []), { id: nuevoId(), tipo: "link_curso", quien: yo?.corto || "", en: new Date().toISOString() }] },
      false,
      `Le envió el link de curso a un interesado: ${x.nombre}`
    );
  }

  return (
    <Modal titulo={x.nombre} sub={[x.curso || "Sin curso todavía", x.via === "link" ? "por el link" : "a mano", fechaDeIso(x.creadoEn), x.cel ? formatoCel(x.cel) : ""].filter(Boolean).join(" · ")} cerrar={cerrar}>
      {/* V76 (pedido explícito: "Boton de editar datos ponlo abajo a la
          derecha o arriba a la derecha y que sea mas discreto", "poner
          boton de inscribir mas chevere, puede tener el amarillo del
          app") -- Editar datos pasa a un link chiquito arriba a la
          derecha; Inscribir y WhatsApp quedan como los dos botones
          principales, del mismo tamaño, Inscribir con el amarillo del
          app. */}
      {p.interesados && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="ce-int-editar-top" onClick={() => (setF(x), setEditando((e) => !e))}>
            <IconEdit size={13} /> {editando ? "Cerrar datos" : "Editar datos"}
          </button>
        </div>
      )}
      {/* V76 (pedido explícito, con foto: "el boton de whatsapp vamos a
          ponerlo mas pequeno. Sube un poco el boton de inscribir") --
          Inscribir queda más grande y WhatsApp más chico. */}
      <div className="ce-int-acc">
        {p.estudiantes && !cerradoYa && (
          <button className="btn vj-btn ce-int-insc" onClick={() => (cerrar(), ir(`nuevo:${x.id}`))}>
            Inscribir
          </button>
        )}
        {x.cel && (
          <a className="btn vj-btn ce-wa ce-int-wa-chico" href={linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, te escribimos de Gus Dive Center por el curso${x.curso ? ` de ${x.curso}` : ""}.`)} target="_blank" rel="noopener noreferrer">
            <IconoWA on /> WhatsApp
          </a>
        )}
      </div>
      {p.interesados && !cerradoYa && x.cel && (
        <button className="btn secondary vj-btn ce-int-link-curso" onClick={enviarLinkCurso}>
          Enviar link de curso a estudiante
        </button>
      )}
      {x.buzoId && <div className="hint-text" style={{ marginTop: 6 }}>Ya lo teníamos registrado en el sistema.</div>}
      {est && (
        <a className="vj-link" onClick={() => (cerrar(), ir(`estudiante:${est.id}`))}>
          Ver su ficha de estudiante ({est.curso}) ›
        </a>
      )}

      {editando && (
        <div className="ce-etapa" style={{ marginTop: 10 }}>
          <FormInteresado f={f} setF={setF} cursos={cursos} sinRecordar />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-primary vj-btn"
              onClick={() => {
                if (!f.nombre.trim()) return avisar("Falta el nombre.");
                ops.guardarInteresado({ ...x, nombre: f.nombre.trim(), cel: soloDigitos(f.cel), curso: f.curso, fuente: f.fuente, cuando: f.cuando, nota: f.nota }, false, `Cambió los datos de un interesado: ${x.nombre}`);
                setEditando(false);
              }}
            >
              Guardar datos
            </button>
            <button className="btn secondary vj-btn" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="section-title" style={{ marginTop: 14 }}>
        Seguimiento
      </div>
      <div className="ce-int-hist">
        {historia.map((h) => (
          <div key={h.id} className={`ce-int-h${h.fija ? " fija" : ""}`}>
            <b>{h.t || tipoSeg(h.tipo).t}</b>
            <span>
              {[h.quien, cuandoFue(h.en)].filter(Boolean).join(" · ")}
              {h.texto ? ` · "${h.texto}"` : ""}
            </span>
          </div>
        ))}
      </div>

      {/* V76 (pedido explícito: "vamos a restructurar la forma de
          seguimiento... se ve muy reguero", luego "Sobre maqueta 76,
          propuesta D", y luego, con foto, "quita la fecha") -- "¿qué
          pasó?" es un solo selector, el comentario y Guardar quedan en
          la misma fila. La fecha para recordar se quitó de aquí (se
          sigue pudiendo poner desde "Editar datos"). */}
      {p.interesados && !cerradoYa && (
        <div className="ce-int-nuevo">
          <div className="ce-int-fila-rapida">
            <select className="ce-int-sel" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">¿Qué pasó?…</option>
              {TIPOS_SEG_INT.map((tp) => (
                <option key={tp.k} value={tp.k}>
                  {tp.t}
                </option>
              ))}
            </select>
            <input className="ce-int-txt" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Comentario (opcional)" />
            <button className="btn btn-primary vj-btn ce-int-guardar" onClick={anotar}>
              Guardar
            </button>
          </div>
        </div>
      )}

      {yo?.esTitular && (
        <div className="vj-borrar" style={{ marginTop: 14 }}>
          {borrando ? (
            <>
              <b>¿Borrar a {x.nombre} de Interesados?</b>
              <div className="hint-text">No se puede deshacer. Queda anotado en la bitácora.{est ? " Su ficha de estudiante no se toca." : ""}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn vj-btn vj-rojo" onClick={async () => (await ops.borrarInteresado(x)) && cerrar()}>
                  Sí, borrar
                </button>
                <button className="btn secondary vj-btn" onClick={() => setBorrando(false)}>
                  No
                </button>
              </div>
            </>
          ) : (
            <button className="btn secondary vj-mini vj-rojo-txt" onClick={() => setBorrando(true)}>
              Borrar este interesado…
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
