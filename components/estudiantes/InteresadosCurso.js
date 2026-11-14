"use client";

import { useState } from "react";
import { IconoWA } from "@/components/viajes/Piezas";
import { linkWhatsApp, fechaCorta } from "@/lib/estudiantes/modelo";
import { fechaLarga } from "@/lib/viajes/modelo";
import { nuevoId } from "@/lib/estudiantes/datos";
import { abrioLink, linkCursoPara } from "./Interesados";

// V79 (maqueta V79, "1. B"): la pestaña Interesados de la página de un curso.
// Salen los que dijeron que les interesa ese curso y siguen sin inscribirse,
// con un botón para avisarles por correo a todos de una vez (antes de enviar
// se ve la lista y se puede quitar a alguien). Al que ya se le avisó de esta
// fecha no se le manda otra vez; al que no tiene correo, WhatsApp.
const ABIERTO = (x) => !["inscrito", "no"].includes(x.estado);
export const interesadosDeCurso = (db, nombreCurso) => (db.interesados || []).filter((x) => x.curso && x.curso === nombreCurso && ABIERTO(x));

export default function InteresadosCurso({ db, p, yo, ops, ir, avisar, f, c, elegirDeEntrada = false }) {
  const lista = interesadosDeCurso(db, c?.nombre);
  const avisadoEn = (x) =>
    (x.seguimiento || [])
      .filter((h) => h.tipo === "link_curso" && h.fechaId === f.id)
      .map((h) => String(h.en || ""))
      .sort()
      .pop() || "";
  const candidatos = lista.filter((x) => x.correo && !avisadoEn(x));
  const [eligiendo, setEligiendo] = useState(elegirDeEntrada && candidatos.length > 0);
  const [fuera, setFuera] = useState(() => new Set()); // a los que se les quitó la marca
  const [mandando, setMandando] = useState(false);
  const [hecho, setHecho] = useState(null); // a cuántos se les mandó
  const marcados = candidatos.filter((x) => !fuera.has(x.id));
  const sinCorreo = lista.filter((x) => !x.correo);
  const n = (k) => `${k} persona${k === 1 ? "" : "s"}`;

  async function enviar() {
    if (!marcados.length) return;
    setMandando(true);
    try {
      const r = await fetch("/api/estudiantes/interesado/correo-curso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: marcados.map((x) => x.id), fechaId: f.id }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudieron mandar los correos.");
      const k = (j.enviados || []).length;
      setHecho(k);
      setEligiendo(false);
      setFuera(new Set());
      await ops.recargar();
      avisar(`Correo enviado a ${k}`);
    } catch (e) {
      avisar(e.message || "No se pudieron mandar los correos.");
    }
    setMandando(false);
  }
  function porWhatsApp(x) {
    window.open(linkWhatsApp(x.cel, `Hola ${x.nombre.split(" ")[0]}, ya abrimos el curso de ${c?.nombre || "buceo"}: empieza el ${fechaLarga(f.inicio)}. Aquí tienes el link para inscribirte: ${linkCursoPara(x, f.id)}`), "_blank", "noopener");
    ops.guardarInteresado(
      { ...x, estado: "va", seguimiento: [...(x.seguimiento || []), { id: nuevoId(), tipo: "link_curso", texto: "Por WhatsApp", quien: yo?.corto || "", en: new Date().toISOString(), fechaId: f.id }] },
      false,
      `Le envió el link de curso a un interesado: ${x.nombre}`
    );
  }

  if (!lista.length) return <div className="card hint-text" style={{ margin: 0 }}>Nadie ha dicho que le interesa {c?.nombre || "este curso"}.</div>;

  let titulo = `${n(lista.length)} ${lista.length === 1 ? "dijo" : "dijeron"} que les interesa este curso`;
  if (lista.length === 1) titulo = "1 persona dijo que le interesa este curso";
  let texto = candidatos.length ? `${candidatos.length === 1 ? "A 1 se le puede" : `A ${candidatos.length} se les puede`} avisar por correo. Les llega el botón para inscribirse en esta fecha.` : "Ya se les avisó a todos los que tienen correo.";
  if (eligiendo) {
    titulo = "¿A quién le mandas el correo?";
    texto = "Quita la marca al que no quieras avisar.";
  } else if (hecho != null) {
    titulo = `Listo: se le mandó a ${hecho}`;
    texto = sinCorreo.length ? `${sinCorreo.length === 1 ? "A 1 le falta" : `A ${sinCorreo.length} les falta`} el correo: escríbele por WhatsApp. Cuando alguno se inscriba, sale solo de esta lista.` : "Cuando alguno se inscriba, sale solo de esta lista.";
  }

  return (
    <>
      <div className="ce-avisar">
        <b>{titulo}</b>
        <div className="ce-avisar-h">{texto}</div>
        {p.interesados && !eligiendo && candidatos.length > 0 && (
          <button className="btn btn-primary vj-btn" onClick={() => (setHecho(null), setEligiendo(true))}>
            Avisarles por correo
          </button>
        )}
      </div>
      <div className="card" style={{ padding: "2px 14px" }}>
        {lista.map((x) => {
          const av = avisadoEn(x);
          const puede = !!x.correo && !av;
          return (
            <div key={x.id} className="ce-avisar-fila">
              <label>
                {eligiendo && <input type="checkbox" disabled={!puede || mandando} checked={puede && !fuera.has(x.id)} onChange={(e) => setFuera((s) => { const t = new Set(s); e.target.checked ? t.delete(x.id) : t.add(x.id); return t; })} />}
                <span style={{ minWidth: 0 }}>
                  <b>{x.nombre}</b>
                  <small>{[x.correo || null, x.creadoEn ? `se anotó el ${fechaCorta(String(x.creadoEn).slice(0, 10))}` : null].filter(Boolean).join(" · ")}</small>
                </span>
              </label>
              <span className="ce-avisar-der">
                {abrioLink(x) && <span className="ce-chip azul">Abrió el link</span>}
                {av && <span className="ce-chip ok">Avisado el {fechaCorta(av.slice(0, 10))}</span>}
                {!x.correo && <span className="ce-chip gris">Sin correo</span>}
                {!x.correo && !av && x.cel && p.interesados && (
                  <button className="btn vj-mini ce-wa" onClick={() => porWhatsApp(x)}>
                    <IconoWA on /> WhatsApp
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
      {eligiendo && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button className="btn btn-primary vj-btn" disabled={mandando || !marcados.length} onClick={enviar}>
            {mandando ? "Enviando…" : `Enviar a ${marcados.length}`}
          </button>
          <button className="btn secondary vj-btn" disabled={mandando} onClick={() => (setEligiendo(false), setFuera(new Set()))}>
            Cancelar
          </button>
        </div>
      )}
      <a className="vj-link" style={{ display: "inline-block", marginTop: 10 }} onClick={() => ir("interesados")}>
        Ver todos los interesados ›
      </a>
    </>
  );
}
