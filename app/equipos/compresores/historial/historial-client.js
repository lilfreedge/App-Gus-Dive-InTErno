"use client";

import { useMemo, useState } from "react";
import { formatFecha, formatFechaDDMMAAAADeDate } from "@/lib/format";

const TIPOS = ["Inspección", "Mantenimiento preventivo", "Mantenimiento correctivo"];
const RESPONSABLES = ["Gugi", "Pipe", "Frederick", "Alexander", "Danny"];

export default function HistorialClient({ mantenimientos, compresores, compresorInicial }) {
  const [tipo, setTipo] = useState("");
  const [compresorId, setCompresorId] = useState(compresorInicial || "");
  const [responsable, setResponsable] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(() => {
    return mantenimientos.filter((m) => {
      if (tipo && m.tipo_mantenimiento !== tipo) return false;
      if (compresorId && m.compresor_id !== compresorId) return false;
      if (responsable && m.responsable !== responsable) return false;
      if (desde && m.fecha < desde) return false;
      if (hasta && m.fecha > hasta) return false;
      return true;
    });
  }, [mantenimientos, tipo, compresorId, responsable, desde, hasta]);

  const hayFiltros = tipo || compresorId || responsable || desde || hasta;

  function limpiarFiltros() {
    setTipo("");
    setCompresorId("");
    setResponsable("");
    setDesde("");
    setHasta("");
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Filtros</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <div>
            <label htmlFor="f_tipo" style={{ marginTop: 0 }}>Tipo</label>
            <select id="f_tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f_compresor" style={{ marginTop: 0 }}>Compresor</label>
            <select id="f_compresor" value={compresorId} onChange={(e) => setCompresorId(e.target.value)}>
              <option value="">Todos</option>
              {compresores.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f_responsable">Responsable</label>
            <select id="f_responsable" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
              <option value="">Todos</option>
              {RESPONSABLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div />
          <div>
            <label htmlFor="f_desde">Desde</label>
            <input id="f_desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f_hasta">Hasta</label>
            <input id="f_hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        {hayFiltros && (
          <button className="btn secondary" type="button" onClick={limpiarFiltros} style={{ marginTop: 14 }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="card">
        {filtrados.length === 0 ? (
          <div className="empty">
            {mantenimientos.length === 0
              ? "Aún no hay mantenimientos de compresores registrados."
              : "Ningún mantenimiento coincide con esos filtros."}
          </div>
        ) : (
          filtrados.map((m) => {
            const fotos = [m.foto_horometro_url, m.foto_espacio_url, m.foto_otra_inspeccion_url, m.foto_reparacion_url].filter(Boolean);
            return (
              <div className="list-item" key={m.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    <span className="folio-tag">#{m.folio}</span>
                    {m.tipo_mantenimiento}
                  </span>
                  <span className="list-item-qty">{m.compresor_codigo_snapshot}</span>
                </div>
                <div className="list-item-meta">
                  {m.full_name} · {formatFecha(m.created_at)} · Responsable: {m.responsable}
                </div>
                <div className="list-item-meta">
                  Fecha: {formatFechaDDMMAAAADeDate(m.fecha)} · Horómetro: {m.horometro} h
                </div>
                {m.tipo_mantenimiento === "Inspección" && (
                  <div className="list-item-meta">
                    {[
                      `Aceite: ${m.nivel_aceite || "—"}`,
                      `Limpieza compresor: ${m.limpieza_compresor || "—"}`,
                      `Manguera: ${m.estado_manguera || "—"}`,
                      `Filtro principal: ${m.estado_filtro_principal || "—"}`,
                      `Filtro final: ${m.estado_filtro_final || "—"}`,
                      `Espacio: ${m.limpieza_espacio || "—"}`,
                    ].join(" · ")}
                  </div>
                )}
                {m.otra_inspeccion && <div className="list-item-note">Otra inspección: {m.otra_inspeccion}</div>}
                {(m.tipo_mantenimiento === "Mantenimiento preventivo" || m.tipo_mantenimiento === "Mantenimiento correctivo") && m.proceso_piezas && (
                  <div className="list-item-note">{m.proceso_piezas}</div>
                )}
                {m.notas && <div className="list-item-note">{m.notas}</div>}
                {fotos.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {fotos.map((url) => (
                      <a href={url} target="_blank" rel="noreferrer" key={url}>
                        <img
                          src={url}
                          alt="Foto del mantenimiento"
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--borde)" }}
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
