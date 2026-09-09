"use client";

import { useState } from "react";

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceUnaSemanaISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

export default function ReportesForm({ usuarios }) {
  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [tipo, setTipo] = useState("ambos");
  const [usuarioId, setUsuarioId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("Todos");
  const [tipoGas, setTipoGas] = useState("Todos");

  const mostrarGas = tipo !== "salidas";
  const mostrarCodigoMotivo = tipo !== "llenados";

  function armarParams(formato) {
    const params = new URLSearchParams({ desde, hasta, tipo, formato });
    if (usuarioId) params.set("usuario_id", usuarioId);
    if (mostrarCodigoMotivo && codigo.trim()) params.set("codigo", codigo.trim());
    if (mostrarCodigoMotivo && motivo !== "Todos") params.set("motivo", motivo);
    if (mostrarGas && tipoGas !== "Todos") params.set("tipo_gas", tipoGas);
    return params;
  }

  function descargar(formato) {
    const params = armarParams(formato);
    window.open(`/api/reportes/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="card">
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="desde" style={{ marginTop: 0 }}>
            Desde
          </label>
          <input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="hasta" style={{ marginTop: 0 }}>
            Hasta
          </label>
          <input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
      </div>

      <label htmlFor="tipo">Tipo de dato</label>
      <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="ambos">Todos</option>
        <option value="salidas">Salidas</option>
        <option value="llenados">Llenados</option>
      </select>

      <div className="section-title">Filtros opcionales</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 160px" }}>
          <label style={{ marginTop: 0 }}>Usuario</label>
          <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        {mostrarCodigoMotivo && (
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ marginTop: 0 }}>Código</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: R014"
            />
          </div>
        )}

        {mostrarCodigoMotivo && (
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ marginTop: 0 }}>Motivo</label>
            <select value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              <option>Todos</option>
              <option>Uso interno</option>
              <option>Garantía</option>
            </select>
          </div>
        )}

        {mostrarGas && (
          <div style={{ flex: "1 1 160px" }}>
            <label style={{ marginTop: 0 }}>Tipo de gas</label>
            <select value={tipoGas} onChange={(e) => setTipoGas(e.target.value)}>
              <option>Todos</option>
              <option>Aire</option>
              <option>Nitrox</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" type="button" onClick={() => descargar("pdf")}>
          Descargar PDF
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => descargar("xlsx")}>
          Descargar Excel
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--texto-suave)", marginTop: 10 }}>
        El PDF con este mismo diseño es el que se manda cada semana por correo automáticamente.
      </p>
    </div>
  );
}
