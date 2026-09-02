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

export default function ReportesForm() {
  const [desde, setDesde] = useState(haceUnaSemanaISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [tipo, setTipo] = useState("ambos");
  const [formato, setFormato] = useState("xlsx");

  return (
    <form
      className="card"
      action="/api/reportes/export"
      method="get"
      target="_blank"
    >
      <label htmlFor="desde">Desde</label>
      <input
        id="desde"
        name="desde"
        type="date"
        required
        value={desde}
        onChange={(e) => setDesde(e.target.value)}
      />

      <label htmlFor="hasta">Hasta</label>
      <input
        id="hasta"
        name="hasta"
        type="date"
        required
        value={hasta}
        onChange={(e) => setHasta(e.target.value)}
      />

      <label htmlFor="tipo">Qué incluir</label>
      <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
        <option value="ambos">Salidas y tanques</option>
        <option value="salidas">Solo salidas</option>
        <option value="tanques">Solo tanques</option>
      </select>

      <label htmlFor="formato">Formato</label>
      <select
        id="formato"
        name="formato"
        value={formato}
        onChange={(e) => setFormato(e.target.value)}
      >
        <option value="xlsx">Excel (.xlsx)</option>
        <option value="csv">CSV</option>
      </select>

      <button className="btn btn-primary" type="submit">
        Exportar
      </button>
    </form>
  );
}
