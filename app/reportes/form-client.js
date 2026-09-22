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
  const [tipo, setTipo] = useState("todos");
  const [usuarioId, setUsuarioId] = useState("");
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("Todos");
  const [tipoGas, setTipoGas] = useState("Todos");

  // V12: "Descargar PDF"/"Descargar Excel" pasaron a ser un solo botón
  // "Ver reporte", que abre este preview -- dentro está "Descargar PDF" y
  // "Enviar por correo" (a la propia cuenta de quien lo pidió).
  const [vista, setVista] = useState(null); // null = modal cerrado
  const [cargandoVista, setCargandoVista] = useState(false);
  const [errorVista, setErrorVista] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState(null);

  const mostrarGas = tipo === "llenados" || tipo === "todos";
  const mostrarCodigoMotivo = tipo === "salidas" || tipo === "todos";

  function armarParams(formato) {
    const params = new URLSearchParams({ desde, hasta, tipo });
    if (formato) params.set("formato", formato);
    if (usuarioId) params.set("usuario_id", usuarioId);
    if (mostrarCodigoMotivo && codigo.trim()) params.set("codigo", codigo.trim());
    if (mostrarCodigoMotivo && motivo !== "Todos") params.set("motivo", motivo);
    if (mostrarGas && tipoGas !== "Todos") params.set("tipo_gas", tipoGas);
    return params;
  }

  async function verReporte() {
    setVista(null);
    setErrorVista(null);
    setMensajeEnvio(null);
    setCargandoVista(true);

    try {
      const params = armarParams();
      const res = await fetch(`/api/reportes/preview?${params.toString()}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setErrorVista(data.error || "No se pudo generar la vista previa.");
        setVista({});
        return;
      }

      setVista(data);
    } catch {
      setErrorVista("No se pudo generar la vista previa.");
      setVista({});
    } finally {
      setCargandoVista(false);
    }
  }

  function cerrarVista() {
    setVista(null);
    setErrorVista(null);
    setMensajeEnvio(null);
  }

  function descargarPDF() {
    const params = armarParams("pdf");
    window.open(`/api/reportes/export?${params.toString()}`, "_blank");
  }

  async function enviarPorCorreo() {
    setEnviando(true);
    setMensajeEnvio(null);

    try {
      const params = armarParams();
      const res = await fetch(`/api/reportes/enviar-a-mi?${params.toString()}`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setMensajeEnvio({ tipo: "error", texto: data.error || "No se pudo enviar el correo." });
        return;
      }

      setMensajeEnvio({ tipo: "ok", texto: `Enviado a ${data.correo}.` });
    } catch {
      setMensajeEnvio({ tipo: "error", texto: "No se pudo enviar el correo." });
    } finally {
      setEnviando(false);
    }
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
        <option value="todos">Todos</option>
        <option value="salidas">Salidas</option>
        <option value="llenados">Llenados</option>
        <option value="inspecciones">Inspecciones visuales</option>
        <option value="mantenimientos">Mantenimientos de reguladores</option>
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
        <button className="btn btn-primary" type="button" onClick={verReporte} disabled={cargandoVista}>
          {cargandoVista ? "Cargando..." : "Ver reporte"}
        </button>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--texto-suave)", marginTop: 10 }}>
        El PDF con este mismo diseño es el que se manda cada semana por correo automáticamente.
      </p>

      {vista && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarVista();
          }}
        >
          <div className="modal-panel modal-panel-ancho">
            <div className="modal-title">{vista.titulo || "Vista previa"}</div>

            {errorVista && (
              <div className="error-msg" style={{ marginTop: 10 }}>
                ⚠ {errorVista}
              </div>
            )}

            {!errorVista && vista.filas && (
              <>
                <p style={{ fontSize: 12, color: "var(--texto-suave)", margin: "2px 0 12px" }}>
                  Del {vista.desde} al {vista.hasta} · {vista.filas.length} registro
                  {vista.filas.length === 1 ? "" : "s"}
                </p>
                <div style={{ overflow: "auto", maxHeight: "50vh" }}>
                  <table className="reporte-preview-tabla">
                    <thead>
                      <tr>
                        <th>{vista.col1}</th>
                        {vista.incluyeCantidad && <th>Cant.</th>}
                        <th>{vista.col2}</th>
                        <th>Usuario</th>
                        <th>Fecha</th>
                        <th>No.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vista.filas.length === 0 && (
                        <tr>
                          <td
                            colSpan={vista.incluyeCantidad ? 6 : 5}
                            style={{ textAlign: "center", color: "var(--texto-suave)" }}
                          >
                            Sin datos en el rango elegido.
                          </td>
                        </tr>
                      )}
                      {vista.filas.map((f, i) => (
                        <tr key={`${f.folio}-${f.codigoTipo}-${i}`}>
                          <td>{f.codigoTipo}</td>
                          {vista.incluyeCantidad && <td>{f.cantidad ?? "—"}</td>}
                          <td>{f.motivoGas}</td>
                          <td>{f.usuario}</td>
                          <td>{f.fecha}</td>
                          <td>#{f.folio}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {mensajeEnvio && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: mensajeEnvio.tipo === "error" ? "var(--rojo)" : "var(--azul-texto)",
                }}
              >
                {mensajeEnvio.texto}
              </div>
            )}

            <div className="modal-actions" style={{ flexWrap: "wrap" }}>
              <button className="btn secondary" type="button" onClick={cerrarVista}>
                Cerrar
              </button>
              {!errorVista && (
                <>
                  <button className="btn secondary" type="button" onClick={enviarPorCorreo} disabled={enviando}>
                    {enviando ? "Enviando..." : "Enviar por correo"}
                  </button>
                  <button className="btn btn-primary" type="button" onClick={descargarPDF}>
                    Descargar PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
