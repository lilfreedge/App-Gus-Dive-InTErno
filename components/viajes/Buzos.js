"use client";

import { useState } from "react";
import { fechaLarga, formatoCel, formatoCedula, rd, soloDigitos, estadoViaje, ESTADOS_VIAJE, nuevoIdLocal, TALLAS } from "@/lib/viajes/modelo";
import { Chip, Atras, CampoCel, Buscar } from "./Piezas";

const AGENCIAS = ["PADI", "SSI", "SNSI", "Raid", "NAUI", "Otra", "No es buzo (snorkel)"];

function FormBuzo({ b, p, guardar, cancelar, nuevo }) {
  const [f, setF] = useState(() => ({
    nombre: b.nombre || "",
    doc: b.doc || "",
    pasaporte: b.pasaporte || "",
    cel: formatoCel(b.cel || ""),
    correo: b.correo || "",
    agencia: b.agencia || "",
    nivel: b.nivel || "",
    cert: b.cert || "",
    bcd: b.tallas?.bcd || "",
    wetsuit: b.tallas?.wetsuit || "",
    chapaletas: b.tallas?.chapaletas || "",
    emergencia: b.emergencia || "",
    abono: String(b.abono || ""),
    staff: !!b.staff,
    notas: b.notas || "",
  }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <div className="card">
      <div className="vj-form2">
        <div>
          <label>Nombre y apellido</label>
          <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} />
        </div>
        <div>
          <label>Cédula</label>
          <input inputMode="numeric" value={f.doc} onChange={(e) => set("doc", formatoCedula(e.target.value))} placeholder="000-0000000-0" />
        </div>
        <div>
          <label>Pasaporte (si no tiene cédula)</label>
          <input value={f.pasaporte} onChange={(e) => set("pasaporte", e.target.value.toUpperCase())} />
        </div>
        <div>
          <label>Celular</label>
          <CampoCel value={f.cel} onChange={(v) => set("cel", v)} />
        </div>
        <div>
          <label>Correo</label>
          <input value={f.correo} onChange={(e) => set("correo", e.target.value)} />
        </div>
        <div>
          <label>Certificación</label>
          <select value={f.agencia} onChange={(e) => set("agencia", e.target.value)}>
            <option value="">—</option>
            {AGENCIAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Nivel</label>
          <input value={f.nivel} onChange={(e) => set("nivel", e.target.value)} placeholder="Open Water, Advanced…" />
        </div>
        <div>
          <label>Número de certificación</label>
          <input value={f.cert} onChange={(e) => set("cert", e.target.value)} />
        </div>
        <div>
          <label>Tallas: BCD / wetsuit / chapaletas</label>
          {/* V47: en lista, igual que en el link. Si tenía una talla escrita
              a mano que no está en la lista, se sigue viendo. */}
          <div style={{ display: "flex", gap: 6 }}>
            {TALLAS.map((t) => (
              <select key={t.k} value={f[t.k]} onChange={(e) => set(t.k, e.target.value)} title={t.t} style={{ minWidth: 0, flex: 1 }}>
                <option value="">{t.k === "bcd" ? "BCD" : t.k === "wetsuit" ? "Wetsuit" : "Chap."}</option>
                {f[t.k] && !t.ops.some((o) => o.v === f[t.k]) && <option value={f[t.k]}>{f[t.k]}</option>}
                {t.ops.map((o) => (
                  <option key={o.v} value={o.v}>
                    {t.k === "chapaletas" ? o.v : o.t}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>
        <div>
          <label>Contacto de emergencia</label>
          <input value={f.emergencia} onChange={(e) => set("emergencia", e.target.value)} />
        </div>
        {p.pagos && (
          <div>
            <label>Abono a favor (RD$)</label>
            <input inputMode="numeric" value={f.abono} onChange={(e) => set("abono", soloDigitos(e.target.value))} />
          </div>
        )}
      </div>
      <label>Notas</label>
      <input value={f.notas} onChange={(e) => set("notas", e.target.value)} />
      <label className="vj-check">
        <input type="checkbox" checked={f.staff} onChange={(e) => set("staff", e.target.checked)} /> Es staff (guía / instructor)
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="btn secondary vj-btn" onClick={cancelar}>
          Cancelar
        </button>
        <button
          className="btn btn-primary vj-btn"
          disabled={!f.nombre.trim()}
          onClick={() =>
            guardar({
              nombre: f.nombre.trim(),
              doc: f.doc,
              pasaporte: f.pasaporte,
              cel: soloDigitos(f.cel),
              correo: f.correo,
              agencia: f.agencia,
              nivel: f.nivel,
              cert: f.cert,
              tallas: { bcd: f.bcd, wetsuit: f.wetsuit, chapaletas: f.chapaletas },
              emergencia: f.emergencia,
              ...(p.pagos ? { abono: Number(f.abono) || 0 } : {}),
              staff: f.staff,
              notas: f.notas,
            })
          }
        >
          {nuevo ? "Crear buzo" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export function Buzos({ db, ops, p, ir }) {
  const [q, setQ] = useState("");
  const [creando, setCreando] = useState(false);
  const [verStaff, setVerStaff] = useState(false);
  const qn = q.toLowerCase().replace(/-/g, "");
  const lista = db.buzos
    .filter((b) => (verStaff ? b.staff : !b.staff))
    .filter((b) => !q || `${b.nombre} ${b.cel} ${(b.doc || "").replace(/-/g, "")} ${b.pasaporte || ""} ${b.cert}`.toLowerCase().includes(qn))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Buzos
        </h1>
        {p.inscribir && !creando && (
          <button className="btn btn-primary vj-btn" onClick={() => setCreando(true)}>
            + Nuevo buzo
          </button>
        )}
      </div>
      <div className="hint-text" style={{ margin: "6px 0 8px" }}>
        Se llenan solos cuando alguien se inscribe por primera vez con el link. {lista.length} {verStaff ? "de staff" : "buzos"}.
      </div>
      {creando && (
        <FormBuzo
          b={{}}
          p={p}
          nuevo
          cancelar={() => setCreando(false)}
          guardar={(datos) => {
            const id = nuevoIdLocal();
            ops.crearBuzo({ id, abono: 0, ...datos });
            setCreando(false);
            ir(`buzo:${id}`);
          }}
        />
      )}
      <div className="vj-filtros">
        <button className={`vj-filtro${!verStaff ? " sel" : ""}`} onClick={() => setVerStaff(false)}>
          Buzos
        </button>
        <button className={`vj-filtro${verStaff ? " sel" : ""}`} onClick={() => setVerStaff(true)}>
          Staff
        </button>
      </div>
      <Buscar value={q} onChange={setQ} placeholder="Nombre, celular, cédula o certificación…" />
      <div className="card vj-lista">
        {lista.length === 0 && <div className="hint-text" style={{ padding: 14 }}>No hay nadie con esa búsqueda.</div>}
        {lista.map((b) => {
          const n = db.inscripciones.filter((x) => x.buzoId === b.id && x.estado !== "quitado").length;
          return (
            <button key={b.id} className="vj-fila vj-fila-boton" onClick={() => ir(`buzo:${b.id}`)}>
              <div className="vj-fila-main">
                <div className="vj-fila-nombre">{b.nombre}</div>
                <div className="hint-text">
                  {formatoCel(b.cel) || "sin celular"} · {b.agencia ? `${b.agencia} ${b.nivel || ""}` : "Sin certificación"}
                  {!b.doc && !b.pasaporte ? " · sin cédula todavía" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {(b.abono || 0) > 0 && <Chip c="azul">Abono {rd(b.abono)}</Chip>}
                <span className="hint-text" style={{ whiteSpace: "nowrap" }}>
                  {n} viaje{n === 1 ? "" : "s"} ›
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function FichaBuzo({ db, ops, id, p, ir }) {
  const [editando, setEditando] = useState(false);
  const b = db.buzos.find((x) => x.id === id);
  const mismos = db.buzos.filter((x) => x.id !== b.id && x.cel && x.cel === b.cel);
  const viajes = db.inscripciones
    .filter((x) => x.buzoId === b.id && x.estado !== "quitado")
    .map((x) => ({ x, v: db.viajes.find((v) => v.id === x.viajeId) }))
    .filter((y) => y.v)
    .sort((a, c) => c.v.fecha.localeCompare(a.v.fecha));
  const t = b.tallas || {};
  return (
    <>
      <Atras onClick={() => ir("buzos")}>Buzos</Atras>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          {b.nombre}
        </h1>
        {p.inscribir && !editando && (
          <button className="btn secondary vj-btn" onClick={() => setEditando(true)}>
            Editar datos
          </button>
        )}
      </div>
      {editando ? (
        <div style={{ marginTop: 10 }}>
          <FormBuzo
            b={b}
            p={p}
            cancelar={() => setEditando(false)}
            guardar={(datos) => {
              ops.guardarBuzo(b, datos, `Editó los datos de ${datos.nombre}`);
              setEditando(false);
            }}
          />
        </div>
      ) : (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="vj-dato">
            <span>{b.pasaporte && !b.doc ? "Pasaporte" : "Cédula"}</span>
            <b>{b.doc || b.pasaporte || "Todavía no la ha puesto"}</b>
          </div>
          <div className="vj-dato">
            <span>Celular</span>
            <b>{formatoCel(b.cel) || "—"}</b>
          </div>
          <div className="vj-dato">
            <span>Correo</span>
            <b>{b.correo || "—"}</b>
          </div>
          <div className="vj-dato">
            <span>Certificación</span>
            <b>
              {b.agencia || "—"} {b.nivel} {b.cert}
            </b>
          </div>
          <div className="vj-dato">
            <span>Tallas</span>
            <b>
              BCD {t.bcd || "—"} · wetsuit {t.wetsuit || t.bcd || "—"} · chapaletas {t.chapaletas || "—"}
            </b>
          </div>
          {b.emergencia && (
            <div className="vj-dato">
              <span>Emergencia</span>
              <b>{b.emergencia}</b>
            </div>
          )}
          {p.pagos && (
            <div className="vj-dato">
              <span>Abono a favor</span>
              <b style={{ color: b.abono ? "var(--verde)" : "inherit" }}>{b.abono ? rd(b.abono) : "—"}</b>
            </div>
          )}
          {b.notas && (
            <div className="vj-dato">
              <span>Notas</span>
              <b>{b.notas}</b>
            </div>
          )}
          {mismos.length > 0 && (
            <div className="hint-text" style={{ marginTop: 8 }}>
              Comparte el celular con: {mismos.map((m) => m.nombre).join(", ")} (cada uno tiene su propia cédula, no se confunden).
            </div>
          )}
        </div>
      )}
      <div className="section-title">Sus buceos ({viajes.length})</div>
      <div className="card vj-lista">
        {viajes.length === 0 && <div className="hint-text" style={{ padding: 14 }}>Todavía no ha ido a ningún buceo.</div>}
        {viajes.map(({ x, v }) => {
          const ev = estadoViaje(v);
          return (
            <button key={x.id} className="vj-fila vj-fila-boton" onClick={() => ir(`viaje:${v.id}`)}>
              <div className="vj-fila-main">
                <div className="vj-fila-nombre">{v.nombre}</div>
                <div className="hint-text">{fechaLarga(v.fecha)}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {x.asistio === true && <Chip c="verde">Asistió</Chip>}
                {x.asistio === false && <Chip c="rojo">No vino</Chip>}
                {x.asistio == null && <Chip c={ESTADOS_VIAJE[ev].c}>{ESTADOS_VIAJE[ev].t}</Chip>}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
