"use client";

import { useState } from "react";
import Link from "next/link";
import { TIPOS_MANUAL, tituloManual, linkManual } from "@/lib/manuales";

// V51 -- Más › Manuales (App Interno y App Equipos de clientes) y la
// pantalla de manuales del técnico: por tipo de equipo, con buscador.
// `desde`: "interno" | "clientes" | "tecnico" (a dónde vuelve el formulario).
export default function ManualesLista({ manuales = [], puedeEditar = false, desde = "interno", grande = false }) {
  const [q, setQ] = useState("");
  const b = q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const filtrados = manuales.filter(
    (m) =>
      !b ||
      `${m.tipo} ${m.marca} ${m.modelos} ${m.descripcion || ""}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .includes(b)
  );
  const tipos = [...TIPOS_MANUAL, ...new Set(manuales.map((m) => m.tipo).filter((t) => !TIPOS_MANUAL.includes(t)))];

  return (
    <div>
      {puedeEditar && (
        <Link href={`/manuales/nuevo?desde=${desde}`}>
          <button type="button" className="btn btn-primary" style={{ width: "auto", margin: "0 0 12px" }}>
            + Agregar manual
          </button>
        </Link>
      )}
      {manuales.length > 0 && (
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar marca o modelo…" style={{ margin: "0 0 12px", fontSize: grande ? 16 : undefined }} />
      )}
      <div className="card">
        {!manuales.length && <div className="empty">Todavía no hay manuales.</div>}
        {manuales.length > 0 && !filtrados.length && <div className="empty">No hay manuales con eso.</div>}
        {tipos.map((t) => {
          const deTipo = filtrados.filter((m) => m.tipo === t);
          if (!deTipo.length) return null;
          return (
            <div key={t}>
              <div className="section-title" style={{ marginTop: 6 }}>
                {t}
              </div>
              {deTipo.map((m) => (
                <div key={m.id} className="manual-fila">
                  <span className={`manual-ic${m.url ? " link" : ""}`}>{m.url ? "LINK" : "PDF"}</span>
                  <div className="manual-fila-t">
                    <b>{tituloManual(m)}</b>
                    {m.descripcion && <span>{m.descripcion}</span>}
                  </div>
                  {puedeEditar && (
                    <Link href={`/manuales/${m.id}/editar?desde=${desde}`} className="hint-text" style={{ margin: 0, fontWeight: 700 }}>
                      Editar
                    </Link>
                  )}
                  <a href={linkManual(m)} target="_blank" rel="noreferrer">
                    <button type="button" className="btn secondary" style={{ width: "auto", margin: 0, padding: "6px 12px" }}>
                      Abrir
                    </button>
                  </a>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
