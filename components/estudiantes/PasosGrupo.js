"use client";

import { useState } from "react";
import { IconBook, IconDivingMask, IconPackage, IconCheck, IconX } from "@/components/icons";
import { GRUPOS_PASOS, PASOS_EN_GRUPO, nombrePasoGrupo, valorPaso, hechoPaso, leTocaPaso, nombreValorPaso, nombreExamen, primerNombre } from "@/lib/estudiantes/modelo";

// V95 (maqueta v95, aprobada): marcar pasos del curso a varios estudiantes a
// la vez. "A": desde la página del curso (escoger uno o varios pasos y
// desmarcar a quien no vino). "C": desde la ficha, al marcar Listo pregunta si
// también es para los demás del mismo curso. Todo queda en la bitácora, una
// línea por cada paso de cada estudiante, y se puede deshacer.

const ICONOS = { libro: IconBook, mascara: IconDivingMask, caja: IconPackage };
const ORDEN = GRUPOS_PASOS.flatMap((g) => g.ks);
const yLista = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`);
// Copias de cursoDe/buzoDe de Inicio.js (así este archivo no depende de Inicio).
const nombreDe = (db, e) => db.buzos.find((b) => b.id === e.buzoId)?.nombre || "—";
const cursoDeEst = (db, e) => db.cursos.find((c) => c.id === e.cursoId) || db.cursos.find((c) => c.nombre === e.curso) || null;
const valorListo = (k) => (k === "examen" ? "aprobado" : "listo");

// Arma la lista para ops.marcarEnGrupo a partir de cambios [{ est, k, antes, despues }].
function armar(db, cambios, deshacer) {
  const porEst = new Map();
  for (const x of cambios) {
    if (!porEst.has(x.est.id)) porEst.set(x.est.id, []);
    porEst.get(x.est.id).push(x);
  }
  const lista = [];
  for (const xs of porEst.values()) {
    const est = xs[0].est;
    const pasos = { ...(est.pasos || {}) };
    let tocaPasos = false;
    let examen;
    const lineas = [];
    for (const x of xs) {
      if (x.k === "examen") examen = x.despues;
      else {
        pasos[x.k] = x.despues;
        tocaPasos = true;
      }
      lineas.push({ texto: `${deshacer ? "Deshizo " : ""}${nombrePasoGrupo(x.k)} (en grupo): ${nombreDe(db, est)}`, antes: nombreValorPaso(x.k, x.antes), despues: nombreValorPaso(x.k, x.despues) });
    }
    lista.push({ est, cambios: { ...(tocaPasos ? { pasos } : {}), ...(examen !== undefined ? { examen } : {}) }, lineas });
  }
  return lista;
}

export function MarcarEnGrupo({ db, c, gente, ops }) {
  const [abierto, setAbierto] = useState(false);
  const [sel, setSel] = useState([]);
  const [marcas, setMarcas] = useState({});
  const [ultimo, setUltimo] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Solo los que están en el paso 1 (Curso): en los demás ya no se tocan los pasos.
  const enCurso = gente.filter((e) => e.estado === "curso");
  const grupos = GRUPOS_PASOS.map((g) => ({ ...g, ks: g.ks.filter((k) => enCurso.some((e) => leTocaPaso(e, c, k))) })).filter((g) => g.ks.length);

  // Lo que se le marca a cada uno: los pasos en Pendiente. El examen solo si está
  // en Pendiente (si está en "Repetir" u otro, se cambia en su ficha).
  const porMarcar = (e, k) => leTocaPaso(e, c, k) && valorPaso(e, k) === "pendiente";
  const pendienteDe = (e, ks = sel) => ks.some((k) => porMarcar(e, k));
  const porDefecto = (e, ks) => pendienteDe(e, ks);

  function tocar(k) {
    const nuevo = sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k].sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b));
    setSel(nuevo);
    setMarcas(Object.fromEntries(enCurso.map((e) => [e.id, porDefecto(e, nuevo)])));
  }
  const elegidos = enCurso.filter((e) => marcas[e.id] && pendienteDe(e));

  async function marcar() {
    const cambios = [];
    for (const e of elegidos) for (const k of sel) if (porMarcar(e, k)) cambios.push({ est: e, k, antes: valorPaso(e, k), despues: valorListo(k) });
    if (!cambios.length) return;
    setGuardando(true);
    const ok = await ops.marcarEnGrupo(armar(db, cambios, false));
    setGuardando(false);
    if (ok) {
      const n = new Set(cambios.map((x) => x.est.id)).size;
      setUltimo({ cambios: cambios.map((x) => ({ id: x.est.id, k: x.k, antes: x.antes, despues: x.despues })), texto: `${yLista(sel.map(nombrePasoGrupo))}: marcado a ${n} estudiante${n === 1 ? "" : "s"}.` });
      setAbierto(false);
      setSel([]);
    }
  }

  async function deshacer() {
    // Solo se devuelve lo que sigue como quedó (si alguien lo cambió después, se deja).
    const cambios = [];
    for (const x of ultimo.cambios) {
      const est = db.estudiantes.find((y) => y.id === x.id);
      if (est && valorPaso(est, x.k) === x.despues) cambios.push({ est, k: x.k, antes: x.despues, despues: x.antes });
    }
    if (await ops.marcarEnGrupo(armar(db, cambios, true))) setUltimo(null);
  }

  if (!enCurso.length || !grupos.length) return null;
  const pas = sel.filter((k) => k !== "examen").map(nombrePasoGrupo);
  const resumen = [pas.length ? `${yLista(pas)} ${pas.length === 1 ? "queda" : "quedan"} Listo.` : "", sel.includes("examen") ? "Examen queda Aprobado." : ""].filter(Boolean).join(" ");

  return (
    <div className="ce-gp-zona">
      {ultimo && (
        <div className="ce-gp-hecho">
          <span>{ultimo.texto}</span>
          <span className="ce-gp-hecho-acc">
            <button type="button" className="ce-gp-deshacer" onClick={deshacer}>
              Deshacer
            </button>
            <button type="button" className="ce-gp-cerrar" aria-label="Cerrar" onClick={() => setUltimo(null)}>
              <IconX size={16} />
            </button>
          </span>
        </div>
      )}
      {!abierto ? (
        <button
          type="button"
          className="btn ce-gp-boton"
          onClick={() => {
            setAbierto(true);
            setSel([]);
            setMarcas({});
          }}
        >
          Marcar pasos en grupo
        </button>
      ) : (
        <div className="ce-gp-panel">
          <h3>¿Qué pasos hicieron?</h3>
          <div className="hint-text" style={{ marginTop: 2 }}>
            Toca uno o varios. Tócalo otra vez para quitarlo.
          </div>
          {grupos.map((g) => {
            const Ico = ICONOS[g.icono];
            return (
              <div key={g.t}>
                <div className="ce-gp-t">
                  <Ico size={16} />
                  {g.t}
                </div>
                <div className="ce-gp-g">
                  {g.ks.map((k) => {
                    const qs = enCurso.filter((e) => leTocaPaso(e, c, k));
                    const n = qs.length;
                    const l = qs.filter((e) => hechoPaso(e, k)).length;
                    const lleno = l === n;
                    const ex = k === "examen";
                    return (
                      <button key={k} type="button" disabled={lleno} className={`ce-gp${lleno ? " lleno" : sel.includes(k) ? " sel" : ""}`} onClick={() => tocar(k)}>
                        <span className="ok">
                          <IconCheck size={12} />
                        </span>
                        <b>{nombrePasoGrupo(k)}</b>
                        <span className="bar">
                          <i style={{ width: `${Math.round((l / n) * 100)}%` }} />
                        </span>
                        <small>{lleno ? (ex ? "Todos aprobados" : "Todos listos") : `${l} de ${n} ${ex ? "aprobados" : "listos"}`}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {sel.length > 0 && (
            <>
              <h3 style={{ marginTop: 18 }}>¿Quiénes hicieron {yLista(sel.map(nombrePasoGrupo))}?</h3>
              <div className="hint-text" style={{ marginTop: 2 }}>
                Ya vienen todos marcados. Desmarca a quien no vino.
              </div>
              <div style={{ marginTop: 6 }}>
                {enCurso.map((e) => {
                  const toca = sel.filter((k) => leTocaPaso(e, c, k));
                  const ya = !pendienteDe(e);
                  const parte = toca.filter((k) => hechoPaso(e, k));
                  const exOtro = toca.includes("examen") && !hechoPaso(e, "examen") && valorPaso(e, "examen") !== "pendiente";
                  const nota = [parte.length ? `Ya tiene ${yLista(parte.map(nombrePasoGrupo))}` : "", exOtro ? `Examen: ${nombreExamen(valorPaso(e, "examen"))}, se cambia en su ficha` : ""].filter(Boolean).join(" · ");
                  return (
                    <label key={e.id} className={`ce-gp-marca${ya ? " off" : ""}`}>
                      <input type="checkbox" checked={ya || !!marcas[e.id]} disabled={ya} onChange={(ev) => setMarcas({ ...marcas, [e.id]: ev.target.checked })} />
                      <span>
                        {nombreDe(db, e)}
                        {!ya && nota && <small>{nota}</small>}
                      </span>
                      {ya && <span className="ya">{!toca.length ? "No le toca" : exOtro ? "En su ficha" : "Ya lo tiene"}</span>}
                    </label>
                  );
                })}
              </div>
              <div className="hint-text" style={{ fontWeight: 700, marginTop: 10 }}>
                {resumen}
              </div>
            </>
          )}
          <div className="ce-gp-pie">
            {sel.length > 0 && (
              <button type="button" className="btn ce-gp-boton" disabled={!elegidos.length || guardando} onClick={marcar}>
                {guardando ? "Guardando…" : elegidos.length ? `Marcar ${sel.length === 1 ? nombrePasoGrupo(sel[0]) : `${sel.length} pasos`} a ${elegidos.length} estudiante${elegidos.length === 1 ? "" : "s"}` : "Marca al menos uno"}
              </button>
            )}
            <button type="button" className="btn secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// "C": los demás del mismo curso (misma fecha, en el paso 1) que tienen ese paso pendiente.
export function otrosParaPaso(db, est, k) {
  if (!est.fechaId || !PASOS_EN_GRUPO.includes(k) || k === "examen") return [];
  return db.estudiantes.filter((x) => x.id !== est.id && x.fechaId === est.fechaId && x.estado === "curso" && leTocaPaso(x, cursoDeEst(db, x), k) && valorPaso(x, k) === "pendiente");
}

export function TambienParaOtros({ db, est, k, ops, alCerrar }) {
  const otros = otrosParaPaso(db, est, k);
  const [marcas, setMarcas] = useState(() => Object.fromEntries(otros.map((x) => [x.id, true])));
  const [guardando, setGuardando] = useState(false);
  if (!otros.length) return null;
  const elegidos = otros.filter((x) => marcas[x.id] !== false);
  async function marcar() {
    setGuardando(true);
    const ok = await ops.marcarEnGrupo(armar(db, elegidos.map((x) => ({ est: x, k, antes: valorPaso(x, k), despues: "listo" })), false));
    setGuardando(false);
    if (ok) alCerrar(elegidos.length);
  }
  return (
    <div className="ce-gp-panel ce-gp-tambien">
      <h3>¿{nombrePasoGrupo(k)} también para los demás de este curso?</h3>
      {otros.map((x) => (
        <label key={x.id} className="ce-gp-marca">
          <input type="checkbox" checked={marcas[x.id] !== false} onChange={(ev) => setMarcas({ ...marcas, [x.id]: ev.target.checked })} />
          <span>{nombreDe(db, x)}</span>
        </label>
      ))}
      <div className="ce-gp-pie">
        <button type="button" className="btn ce-gp-boton" disabled={!elegidos.length || guardando} onClick={marcar}>
          {guardando ? "Guardando…" : "Marcar a los seleccionados"}
        </button>
        <button type="button" className="btn secondary" onClick={() => alCerrar(0)}>
          Solo a {primerNombre(nombreDe(db, est))}
        </button>
      </div>
    </div>
  );
}
