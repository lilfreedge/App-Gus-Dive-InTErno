"use client";

import { Fragment, useState } from "react";
import { posTeoriaNitrox, TEORIA_NITROX } from "@/lib/estudiantes/junto";
import { DIAS_PARA_ESCOGER, sumarDiasISO, fechaCortaItinerario, horaBonita, choques, itinerarioDe, itinerarioDelCurso, cambiosItinerario, esExamen } from "@/lib/estudiantes/itinerario";
import { linkWhatsApp } from "@/lib/estudiantes/modelo";

// V100 (maqueta V102, "56. me gusta la C pero agrégale la casilla obligatoria
// que tiene la B"): el itinerario de un curso (una fecha abierta). Al crear el
// curso sale un segundo paso "Confirma el itinerario" (C) que no se puede
// confirmar sin marcar "Revisé el itinerario" (B). Si se salta, el curso
// queda "Itinerario sin confirmar" hasta que se confirme en su página.
// "No permitas que ninguna actividad choque con su fecha": al cambiar un
// día, los que ya tienen otra actividad no se pueden escoger.

// V101 (maqueta V105, "75. sí", "76. B"): en Open Water, la "Teoría Nitrox"
// sale después del examen, por cuadrar, solo para los que agregaron Nitrox.
// No se guarda en el itinerario (no es para todos): sale aquí y en Mi curso.
function FilaTeoriaNitrox({ lista }) {
  return lista ? (
    <div className="ce-iti-nx-l">
      <span>Por cuadrar</span>
      <b>
        {TEORIA_NITROX} <em className="ce-iti-nx">Solo los que agregaron Nitrox</em>
      </b>
      <small>con el instructor</small>
    </div>
  ) : (
    <div className="ce-iti-fila nx">
      <div className="ce-iti-f">Por cuadrar</div>
      <div className="ce-iti-a">
        <b>
          {TEORIA_NITROX} <em className="ce-iti-nx">Solo los que agregaron Nitrox</em>
        </b>
        <small>Lo cuadra el estudiante con el instructor</small>
      </div>
    </div>
  );
}

export function EditorItinerario({ inicio, items, onChange, nitrox = false }) {
  const [abierto, setAbierto] = useState(null);
  const malos = choques(items);
  const dias = Array.from({ length: DIAS_PARA_ESCOGER }, (_, o) => sumarDiasISO(inicio, o));
  const cambiar = (i, cambio) => onChange(items.map((y, j) => (j === i ? { ...y, ...cambio } : y)));
  const posNx = nitrox ? posTeoriaNitrox(items) : -2;
  return (
    <div className="ce-iti">
      {items.map((x, i) => {
        const ocupadoPor = (iso) => items.find((y, j) => j !== i && y.fecha === iso);
        return (
          <Fragment key={`${x.t}-${i}`}>
          <div className={`ce-iti-fila${malos.has(i) ? " choca" : ""}`}>
            <div className="ce-iti-f">{x.cuadrar ? "Por cuadrar" : fechaCortaItinerario(x.fecha) || "Sin fecha"}</div>
            <div className="ce-iti-a">
              <b>{x.t}</b>
              {x.cuadrar ? <small>Lo cuadra el estudiante con el instructor</small> : x.hora ? <small>{horaBonita(x.hora)}</small> : null}
              {malos.has(i) && <small className="ce-iti-rojo">Choca con otra actividad ese día</small>}
            </div>
            {/* V106: también el examen "por cuadrar" se puede poner en un día. */}
            <button type="button" className="btn secondary vj-mini" onClick={() => setAbierto(abierto === i ? null : i)}>
              {abierto === i ? "Listo" : "Cambiar"}
            </button>
            {abierto === i && (
              <div className="ce-iti-picker">
                <span>
                  Día <em>(los grises ya tienen otra actividad)</em>
                </span>
                <div className="ce-iti-dias">
                  {dias.map((iso) => {
                    const oc = ocupadoPor(iso);
                    return oc ? (
                      <button key={iso} type="button" disabled className="ocupado" title={`Ese día ya tiene ${oc.t}`}>
                        {fechaCortaItinerario(iso)}
                        <small>{oc.t}</small>
                      </button>
                    ) : (
                      <button key={iso} type="button" className={iso === x.fecha ? "sel" : ""} onClick={() => cambiar(i, { fecha: iso, cuadrar: false })}>
                        {fechaCortaItinerario(iso)}
                      </button>
                    );
                  })}
                </div>
                {!x.cuadrar && (
                  <label className="ce-iti-hora">
                    Hora (opcional)
                    <input type="time" value={x.hora || ""} onChange={(e) => cambiar(i, { hora: e.target.value })} />
                  </label>
                )}
                {esExamen(x.t) && !x.cuadrar && (
                  <button type="button" className="ce-iti-reset" onClick={() => cambiar(i, { cuadrar: true, fecha: null, hora: "" })}>
                    Dejarlo por cuadrar con el instructor
                  </button>
                )}
              </div>
            )}
          </div>
          {i === posNx && <FilaTeoriaNitrox />}
          </Fragment>
        );
      })}
    </div>
  );
}

export function ConfirmarItinerario({ f, c, ops, titulo, alTerminar, alSaltar, alCancelar, nitrox = false }) {
  const [items, setItems] = useState(() => itinerarioDe(f, c));
  const [revisado, setRevisado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const malos = choques(items);
  async function confirmar() {
    if (!revisado || malos.size || guardando) return;
    setGuardando(true);
    const cambios = cambiosItinerario(itinerarioDe(f, c), items);
    const ok = await ops.guardarItinerario(f, c, items, true);
    setGuardando(false);
    if (ok) alTerminar?.(cambios);
  }
  return (
    <div className="ce-iti-caja">
      <b className="ce-iti-tit">{titulo || "Confirma el itinerario"}</b>
      <div className="hint-text" style={{ marginTop: 2 }}>
        {c?.nombre} · empieza el {fechaCortaItinerario(f.inicio)}. Cambia lo que haga falta: solo cambia para este curso, el Catálogo no se toca.
      </div>
      {items.length ? (
        <EditorItinerario inicio={f.inicio} items={items} onChange={setItems} nitrox={nitrox} />
      ) : (
        <div className="hint-text">Este curso no tiene itinerario en el Catálogo (sale de los pasos del curso).</div>
      )}
      {items.length > 0 && (
        <button type="button" className="ce-iti-reset" onClick={() => setItems(itinerarioDelCurso(c, f.inicio))}>
          Volver al del Catálogo
        </button>
      )}
      <label className="ce-iti-chk">
        <input type="checkbox" checked={revisado} onChange={(e) => setRevisado(e.target.checked)} />
        Revisé el itinerario y las fechas están bien.
      </label>
      {malos.size > 0 && <div className="ce-iti-aviso">Hay dos actividades el mismo día. Cambia una antes de confirmar.</div>}
      {f.conItinerario === false && <div className="ce-iti-aviso">Para guardar el itinerario falta correr migration_104.sql en Supabase.</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button className="btn btn-primary vj-btn" disabled={!revisado || malos.size > 0 || guardando} onClick={confirmar}>
          {guardando ? "Guardando…" : "Confirmar itinerario"}
        </button>
        {alSaltar && (
          <button className="btn secondary vj-btn" onClick={alSaltar}>
            Lo confirmo después
          </button>
        )}
        {alCancelar && (
          <button className="btn secondary vj-btn" onClick={alCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// En la página del curso: el itinerario y si ya se confirmó.
// `gente`: los inscritos [{ nombre, cel }]. V101 ("64. ok, no está de más"):
// si se cambia un itinerario ya confirmado, ofrece avisarles por WhatsApp.
export function TarjetaItinerario({ f, c, ops, gente = [], nitrox = false }) {
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState(null); // los cambios, para avisar
  if (f.conItinerario === false) return null;
  const items = itinerarioDe(f, c);
  if (!items.length) return null;
  const confirmado = !!f.itinerarioConfirmadoEn;
  return (
    <div className={`card ce-iti-tarjeta${confirmado ? "" : " sin"}`} style={{ marginBottom: 12 }}>
      <div className="pg-res-top">
        <b>Itinerario</b>
        <span className={confirmado ? "" : "ce-iti-sin"}>{confirmado ? `Confirmado el ${fechaCortaItinerario(String(f.itinerarioConfirmadoEn).slice(0, 10))}` : "Sin confirmar"}</span>
      </div>
      {editando ? (
        <ConfirmarItinerario
          f={f}
          c={c}
          ops={ops}
          titulo={confirmado ? "Cambiar el itinerario" : "Confirma el itinerario"}
          nitrox={nitrox}
          alTerminar={(cambios) => {
            setEditando(false);
            if (confirmado && cambios?.length && gente.some((g) => g.cel)) setAviso(cambios);
          }}
          alCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <div className="ce-iti-lista">
            {items.map((x, i) => (
              <Fragment key={`${x.t}-${i}`}>
                <div>
                  <span>{x.cuadrar ? "Por cuadrar" : fechaCortaItinerario(x.fecha)}</span>
                  <b>{x.t}</b>
                  <small>{x.cuadrar ? "con el instructor" : horaBonita(x.hora)}</small>
                </div>
                {nitrox && i === posTeoriaNitrox(items) && <FilaTeoriaNitrox lista />}
              </Fragment>
            ))}
          </div>
          {aviso && (
            <div className="ce-iti-avisar">
              <b>¿Les avisas a los inscritos?</b>
              <div className="hint-text" style={{ marginTop: 2 }}>Cambió: {aviso.join("; ")}</div>
              <div className="ce-iti-avisar-lista">
                {gente
                  .filter((g) => g.cel)
                  .map((g) => (
                    <a
                      key={g.id || g.nombre}
                      className="btn secondary vj-mini"
                      href={linkWhatsApp(g.cel, `Hola ${String(g.nombre || "").split(" ")[0]}, te escribimos de Gus Dive Center: cambiamos el itinerario de tu curso de ${c?.nombre || ""}.\n${aviso.map((x) => `- ${x}`).join("\n")}\nCualquier duda, escríbenos.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp a {String(g.nombre || "").split(" ")[0]}
                    </a>
                  ))}
              </div>
              <button type="button" className="ce-iti-reset" onClick={() => setAviso(null)}>
                No hace falta
              </button>
            </div>
          )}
          <button className={`btn ${confirmado ? "secondary" : "btn-primary"} vj-btn`} style={{ marginTop: 10 }} onClick={() => setEditando(true)}>
            {confirmado ? "Cambiar" : "Confirmar itinerario"}
          </button>
        </>
      )}
    </div>
  );
}
