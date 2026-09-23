"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoDisplay, tipoEquipoLabel } from "@/lib/tipo-equipo";

const TIPOS = ["Tanques", "Reguladores", "BC", "Computadora", "Otro"];
const ESTADOS = ["Pendiente por trabajar", "En proceso", "Pendiente por despachar", "Entregado"];
const BADGE_ESTADO = {
  "Pendiente por trabajar": "badge-rojo",
  "En proceso": "badge-amarillo",
  "Pendiente por despachar": "badge-azul",
  Entregado: "badge-verde",
};

// Mismo patrón que el historial de mantenimientos de Compresores (23-sep-2026,
// lección aprendida ese mismo día): cada fila es un botón que navega a su
// propia ficha, nunca un acordeón.
export default function HistorialClient({ ordenes, clientes }) {
  const [tipo, setTipo] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const filtrados = useMemo(() => {
    return ordenes.filter((o) => {
      if (tipo && o.tipo_equipo !== tipo) return false;
      if (clienteId && o.cliente_id !== clienteId) return false;
      if (estado && o.estado !== estado) return false;
      if (desde && o.fecha < desde) return false;
      if (hasta && o.fecha > hasta) return false;
      return true;
    });
  }, [ordenes, tipo, clienteId, estado, desde, hasta]);

  const hayFiltros = tipo || clienteId || estado || desde || hasta;

  function limpiarFiltros() {
    setTipo("");
    setClienteId("");
    setEstado("");
    setDesde("");
    setHasta("");
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginTop: 0 }}>Filtros</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <div>
            <label htmlFor="f_tipo" style={{ marginTop: 0 }}>Tipo de equipo</label>
            <select id="f_tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{tipoEquipoDisplay(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f_cliente" style={{ marginTop: 0 }}>Cliente</label>
            <select id="f_cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f_estado">Estado</label>
            <select id="f_estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{e}</option>
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
            {ordenes.length === 0 ? "Aún no hay órdenes registradas." : "Ninguna orden coincide con esos filtros."}
          </div>
        ) : (
          filtrados.map((o) => (
            <Link
              key={o.id}
              href={`/app-clientes/ordenes/${o.id}`}
              className="list-item"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <div className="list-item-top">
                <span className="list-item-title">
                  <span className="folio-tag">#{o.folio}</span>
                  {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                </span>
                <span className={`badge ${BADGE_ESTADO[o.estado] || ""}`}>{o.estado}</span>
              </div>
              <div className="list-item-meta">{formatFechaDDMMAAAADeDate(o.fecha)}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
