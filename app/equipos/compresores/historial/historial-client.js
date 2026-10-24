"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { NIVELES_ACEITE, indiceAceite, claseAceite, horometroCorregido, formatHoras } from "@/lib/compresores";
import { IconGear } from "@/components/icons";

const TIPOS = ["Inspección", "Mantenimiento preventivo", "Mantenimiento correctivo"];
const RESPONSABLES = ["Gugi", "Pipe", "Frederick", "Alexander", "Danny"];
const POR_PAGINA = 100;

// Qué se ve (V37, "Personalizar vista": solo el Titular y los
// administradores; los demás ven esto).
const COLUMNAS = [
  { key: "tipo", label: "Tipo" },
  { key: "responsable", label: "Responsable" },
  { key: "horometro", label: "Horómetro y + horas" },
  { key: "aceite", label: "Aceite y ¿echó?" },
  { key: "filtro_principal", label: "Filtro principal" },
  { key: "filtro_final", label: "Filtro final" },
  { key: "manguera", label: "Manguera" },
  { key: "limpieza_compresor", label: "Limpieza del compresor" },
  { key: "limpieza_espacio", label: "Limpieza del espacio" },
  { key: "piezas", label: "Piezas / proceso" },
  { key: "notas", label: "Notas" },
  { key: "fotos", label: "Fotos" },
];
const VISTA_NORMAL = {
  resumen: true,
  grafica: true,
  columnas: Object.fromEntries(COLUMNAS.map((c) => [c.key, c.key !== "notas"])),
};
function unirVista(v) {
  if (!v || typeof v !== "object") return VISTA_NORMAL;
  return {
    resumen: v.resumen !== false,
    grafica: v.grafica !== false,
    columnas: { ...VISTA_NORMAL.columnas, ...(v.columnas || {}) },
  };
}

const ESTADO_CORTO = { Satisfactorio: ["Satisf.", "badge-verde"], Aceptable: ["Acept.", "badge-amarillo"], Deficiente: ["Defic.", "badge-rojo"] };
function Estado({ valor }) {
  if (!valor) return <span className="muted">—</span>;
  const [t, c] = ESTADO_CORTO[valor] || [valor, ""];
  return <span className={`badge ${c}`}>{t}</span>;
}
function Aceite({ m, conEchado = true }) {
  if (!m.nivel_aceite) return <span className="muted">—</span>;
  const clase = claseAceite(m.nivel_aceite);
  return (
    <>
      {clase ? (
        <span className={`badge ${clase}`}>{m.nivel_aceite}</span>
      ) : (
        <span style={{ display: "inline-block", whiteSpace: "normal", maxWidth: 170 }}>{m.nivel_aceite}</span>
      )}
      {conEchado && m.aceite_echado && (
        <span className="badge badge-azul" style={{ marginLeft: 4 }}>
          Se echó
        </span>
      )}
    </>
  );
}

function normalizar(t) {
  return (t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const fecha = formatFechaDDMMAAAADeDate;
const fechaCorta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

export default function HistorialClient({
  mantenimientos,
  compresores,
  compresorInicial,
  proximas = {},
  hoy,
  esAdmin = false,
  miId,
  vistaGuardada = null,
}) {
  const supabase = createClient();
  const router = useRouter();
  const [compresorId, setCompresorId] = useState(compresorInicial || "");
  const [tipo, setTipo] = useState("");
  const [responsable, setResponsable] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [q, setQ] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [vista, setVista] = useState(unirVista(vistaGuardada));
  const [personalizando, setPersonalizando] = useState(false);

  // Compresores con algo registrado o activos, en orden de código.
  const listaCompresores = useMemo(() => {
    const conDatos = new Set(mantenimientos.map((m) => m.compresor_id));
    return compresores.filter((c) => c.activo || conDatos.has(c.id));
  }, [compresores, mantenimientos]);
  const codigoDe = (id, m) => compresores.find((c) => c.id === id)?.codigo || m?.compresor_codigo_snapshot || "—";

  // "+ horas" desde el registro anterior del mismo compresor.
  const masHoras = useMemo(() => {
    const res = {};
    const porC = {};
    for (const m of mantenimientos) (porC[m.compresor_id] ||= []).push(m);
    for (const lista of Object.values(porC)) {
      const orden = [...lista].sort((a, b) =>
        a.fecha === b.fecha ? Number(a.horometro) - Number(b.horometro) : a.fecha < b.fecha ? -1 : 1
      );
      for (let i = 0; i < orden.length; i++) {
        res[orden[i].id] = i === 0 ? null : Math.round((Number(orden[i].horometro) - Number(orden[i - 1].horometro)) * 10) / 10;
      }
    }
    return res;
  }, [mantenimientos]);

  const filtrados = useMemo(() => {
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    return mantenimientos.filter((m) => {
      if (compresorId && m.compresor_id !== compresorId) return false;
      if (tipo && m.tipo_mantenimiento !== tipo) return false;
      if (responsable && m.responsable !== responsable) return false;
      if (desde && m.fecha < desde) return false;
      if (hasta && m.fecha > hasta) return false;
      if (palabras.length) {
        const texto = normalizar(
          [
            codigoDe(m.compresor_id, m),
            m.tipo_mantenimiento,
            m.responsable,
            m.full_name,
            m.nivel_aceite,
            m.proceso_piezas,
            m.notas,
            m.otra_inspeccion,
            m.folio,
            fecha(m.fecha),
          ].join(" ")
        );
        if (!palabras.every((p) => texto.includes(p))) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mantenimientos, compresorId, tipo, responsable, desde, hasta, q]);

  const hayFiltros = tipo || responsable || desde || hasta || q;
  function limpiar() {
    setTipo("");
    setResponsable("");
    setDesde("");
    setHasta("");
    setQ("");
    setVisibles(POR_PAGINA);
  }

  function elegir(id) {
    setCompresorId(id);
    setVisibles(POR_PAGINA);
    try {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("compresor", id);
      else url.searchParams.delete("compresor");
      window.history.replaceState(null, "", url.toString());
    } catch {
      // sin cambiar la dirección
    }
  }

  const compresor = compresores.find((c) => c.id === compresorId) || null;
  const mostrar = filtrados.slice(0, visibles);
  const col = vista.columnas;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Historial de mantenimientos
        </h1>
        {esAdmin && (
          <button
            type="button"
            className="btn secondary"
            onClick={() => setPersonalizando((v) => !v)}
            style={{ marginTop: 0, width: "auto", padding: "6px 12px", fontSize: 12.5, display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <IconGear size={14} /> Personalizar vista
          </button>
        )}
      </div>

      {personalizando && (
        <PanelPersonalizar
          vista={vista}
          onCambiar={setVista}
          onCerrar={() => setPersonalizando(false)}
          supabase={supabase}
          miId={miId}
        />
      )}

      {/* Escoger compresor */}
      <div className="pastillas" style={{ margin: "14px 0" }}>
        {[{ id: "", codigo: "Todos" }, ...listaCompresores].map((c) => (
          <button
            key={c.id || "todos"}
            type="button"
            className={`pastilla${compresorId === c.id ? " pastilla-activa" : ""}`}
            onClick={() => elegir(c.id)}
          >
            {c.codigo}
            {c.activo === false ? " (inactivo)" : ""}
          </button>
        ))}
      </div>

      {compresor ? (
        <>
          {vista.resumen && (
            <Resumen
              compresorId={compresor.id}
              mantenimientos={mantenimientos}
              proxima={proximas[compresor.id]}
              hoy={hoy}
            />
          )}
          {vista.grafica && (
            <GraficaAceite codigo={compresor.codigo} mantenimientos={mantenimientos.filter((m) => m.compresor_id === compresor.id)} />
          )}
        </>
      ) : (
        vista.resumen && (
          <div className="tarjetas-compresores">
            {listaCompresores
              .filter((c) => c.activo)
              .map((c) => (
                <TarjetaCompresor
                  key={c.id}
                  compresor={c}
                  mantenimientos={mantenimientos}
                  proxima={proximas[c.id]}
                  onClick={() => elegir(c.id)}
                />
              ))}
          </div>
        )
      )}

      {/* Filtros y buscador */}
      <div className="card" style={{ padding: "10px 12px", marginBottom: 10 }}>
        <div className="filtros-historial">
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
            <label htmlFor="f_resp" style={{ marginTop: 0 }}>Responsable</label>
            <select id="f_resp" value={responsable} onChange={(e) => setResponsable(e.target.value)}>
              <option value="">Todos</option>
              {RESPONSABLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="f_desde" style={{ marginTop: 0 }}>Desde</label>
            <input id="f_desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div>
            <label htmlFor="f_hasta" style={{ marginTop: 0 }}>Hasta</label>
            <input id="f_hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
      </div>
      <div className="search-bar">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisibles(POR_PAGINA);
          }}
          placeholder="Buscar compresor, tipo, responsable, piezas..."
        />
      </div>
      {hayFiltros && (
        <button type="button" className="btn secondary" onClick={limpiar} style={{ marginTop: 0, marginBottom: 10, width: "auto" }}>
          Limpiar filtros
        </button>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, margin: "6px 0 8px", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>
          {compresor ? `Registros del ${compresor.codigo}` : "Todos los registros, del más nuevo al más viejo"}
        </div>
        <span className="hint-text" style={{ margin: 0 }}>
          Toca un registro para abrirlo · ✎ = horómetro cambiado a mano
        </span>
      </div>

      {filtrados.length === 0 ? (
        <div className="card">
          <div className="empty">
            {mantenimientos.length === 0
              ? "Aún no hay mantenimientos de compresores registrados."
              : "Ningún mantenimiento coincide con esos filtros."}
          </div>
        </div>
      ) : (
        <>
          {/* Compu: tabla con todo en una fila */}
          <div className="solo-pc tabla-historial-wrap">
            <table className="tabla-historial">
              <thead>
                <tr>
                  {!compresor && <th>Compresor</th>}
                  <th>Fecha</th>
                  {col.tipo && <th>Tipo</th>}
                  {col.responsable && <th>Responsable</th>}
                  {col.horometro && <th>Horómetro</th>}
                  {col.horometro && <th>+ horas</th>}
                  {col.aceite && <th>Aceite</th>}
                  {col.aceite && <th>¿Echó?</th>}
                  {col.filtro_principal && <th>Filtro princ.</th>}
                  {col.filtro_final && <th>Filtro final</th>}
                  {col.manguera && <th>Manguera</th>}
                  {col.limpieza_compresor && <th>Limp. compresor</th>}
                  {col.limpieza_espacio && <th>Limp. espacio</th>}
                  {col.piezas && <th>Piezas / proceso</th>}
                  {col.notas && <th>Notas</th>}
                  {col.fotos && <th>Fotos</th>}
                </tr>
              </thead>
              <tbody>
                {mostrar.map((m) => {
                  const ir = () => router.push(`/equipos/compresores/mantenimiento/${m.id}`);
                  const mh = masHoras[m.id];
                  return (
                    <tr key={m.id} onClick={ir} className="fila-click">
                      {!compresor && (
                        <td>
                          <b>{codigoDe(m.compresor_id, m)}</b>
                        </td>
                      )}
                      <td>{fecha(m.fecha)}</td>
                      {col.tipo && <td>{m.tipo_mantenimiento === "Inspección" ? "Inspección" : <b>{m.tipo_mantenimiento.replace("Mantenimiento", "Mant.")}</b>}</td>}
                      {col.responsable && <td>{m.responsable}</td>}
                      {col.horometro && (
                        <td>
                          {formatHoras(m.horometro)}
                          {horometroCorregido(m) && (
                            <span title={`La foto decía ${formatHoras(m.horometro_leido)} h`} style={{ color: "var(--rojo)", fontWeight: 800, marginLeft: 4 }}>
                              ✎
                            </span>
                          )}
                        </td>
                      )}
                      {col.horometro && <td className="muted">{mh === null || mh === undefined ? "—" : `${mh >= 0 ? "+" : ""}${formatHoras(mh)}`}</td>}
                      {col.aceite && (
                        <td>
                          <Aceite m={m} conEchado={false} />
                        </td>
                      )}
                      {col.aceite && <td>{m.aceite_echado === true ? <b>Sí</b> : m.aceite_echado === false ? <span className="muted">No</span> : <span className="muted">—</span>}</td>}
                      {col.filtro_principal && <td><Estado valor={m.estado_filtro_principal} /></td>}
                      {col.filtro_final && <td><Estado valor={m.estado_filtro_final} /></td>}
                      {col.manguera && <td><Estado valor={m.estado_manguera} /></td>}
                      {col.limpieza_compresor && <td><Estado valor={m.limpieza_compresor} /></td>}
                      {col.limpieza_espacio && <td><Estado valor={m.limpieza_espacio} /></td>}
                      {col.piezas && <td className="celda-texto">{m.proceso_piezas || <span className="muted">—</span>}</td>}
                      {col.notas && <td className="celda-texto">{m.notas || <span className="muted">—</span>}</td>}
                      {col.fotos && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <Fotos m={m} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas con todos los datos */}
          <div className="solo-cel card">
            {mostrar.map((m) => (
              <TarjetaRegistro key={m.id} m={m} col={col} mh={masHoras[m.id]} codigo={compresor ? null : codigoDe(m.compresor_id, m)} />
            ))}
          </div>

          {filtrados.length > visibles && (
            <button type="button" className="btn secondary" onClick={() => setVisibles((v) => v + POR_PAGINA)} style={{ marginTop: 12 }}>
              Mostrar más ({filtrados.length - visibles} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Fotos({ m }) {
  const fotos = [m.foto_horometro_url, m.foto_espacio_url, m.foto_otra_inspeccion_url, m.foto_reparacion_url].filter(Boolean);
  if (!fotos.length) return <span className="muted">—</span>;
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {fotos.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="" style={{ width: 26, height: 26, objectFit: "cover", borderRadius: 4, border: "1px solid var(--borde)", display: "block" }} />
        </a>
      ))}
    </span>
  );
}

function TarjetaRegistro({ m, col, mh, codigo }) {
  const estados = [
    ["filtro_principal", "Filtro princ.", m.estado_filtro_principal],
    ["filtro_final", "Filtro final", m.estado_filtro_final],
    ["manguera", "Manguera", m.estado_manguera],
    ["limpieza_compresor", "Limp. compresor", m.limpieza_compresor],
    ["limpieza_espacio", "Limp. espacio", m.limpieza_espacio],
  ].filter(([k, , v]) => col[k] && v);
  return (
    <Link href={`/equipos/compresores/mantenimiento/${m.id}`} className="list-item" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <b>
          {codigo ? `${codigo} · ` : ""}
          {fechaCorta(m.fecha)}
          {col.tipo ? ` · ${m.tipo_mantenimiento}` : ""}
        </b>
        {col.responsable && <span style={{ fontSize: 12, color: "var(--texto-suave)" }}>{m.responsable}</span>}
      </div>
      {col.horometro && (
        <div style={{ fontSize: 13, marginTop: 4 }}>
          Horómetro <b>{formatHoras(m.horometro)}</b>
          {mh !== null && mh !== undefined && <span className="muted"> ({mh >= 0 ? "+" : ""}{formatHoras(mh)})</span>}
          {horometroCorregido(m) && <span style={{ color: "var(--rojo)", fontWeight: 800 }}> ✎</span>}
        </div>
      )}
      {col.aceite && m.nivel_aceite && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          <span className="muted" style={{ fontSize: 12 }}>Aceite:</span>
          <Aceite m={m} />
        </div>
      )}
      {estados.length > 0 && (
        <div style={{ display: "flex", gap: "6px 12px", flexWrap: "wrap", marginTop: 6 }}>
          {estados.map(([k, t, v]) => (
            <span key={k} style={{ fontSize: 11.5, color: "var(--texto-suave)", whiteSpace: "nowrap" }}>
              {t} <Estado valor={v} />
            </span>
          ))}
        </div>
      )}
      {col.piezas && m.proceso_piezas && <div style={{ fontSize: 13, marginTop: 6 }}>{m.proceso_piezas}</div>}
      {col.notas && m.notas && <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>{m.notas}</div>}
    </Link>
  );
}

// Cuadritos de resumen de un compresor.
function Resumen({ compresorId, mantenimientos, proxima, hoy }) {
  const lista = mantenimientos.filter((m) => m.compresor_id === compresorId);
  if (!lista.length) {
    return (
      <div className="card">
        <div className="empty">Este compresor todavía no tiene mantenimientos registrados.</div>
      </div>
    );
  }
  const porHoras = [...lista].sort((a, b) => Number(b.horometro) - Number(a.horometro));
  const actual = porHoras[0];
  const hace30 = new Date(Date.parse(`${hoy}T00:00:00Z`) - 30 * 86400000).toISOString().slice(0, 10);
  const antes = lista.filter((m) => m.fecha <= hace30).sort((a, b) => Number(b.horometro) - Number(a.horometro))[0];
  const masViejo = [...lista].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))[0];
  const base30 = antes || masViejo;
  const uso30 = Math.round((Number(actual.horometro) - Number(base30.horometro)) * 10) / 10;
  const preventivo = lista
    .filter((m) => m.tipo_mantenimiento === "Mantenimiento preventivo")
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  const ultimaInsp = lista
    .filter((m) => m.tipo_mantenimiento === "Inspección")
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : Number(b.horometro) - Number(a.horometro)))[0];

  const claseAc = ultimaInsp ? claseAceite(ultimaInsp.nivel_aceite) : "";
  const colorAc = claseAc === "badge-rojo" ? "var(--rojo)" : claseAc === "badge-amarillo" ? "#b5691f" : claseAc ? "var(--verde)" : undefined;

  return (
    <div className="resumen-compresor">
      <div className="stat-card">
        <div className="stat-value">{formatHoras(actual.horometro)} h</div>
        <div className="stat-label">Horómetro ({fecha(actual.fecha)})</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">{formatHoras(uso30)} h</div>
        <div className="stat-label">{antes ? "Usado en los últimos 30 días" : `Usado desde el ${fecha(masViejo.fecha)}`}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {preventivo ? `${formatHoras(Math.round((Number(actual.horometro) - Number(preventivo.horometro)) * 10) / 10)} h` : "—"}
        </div>
        <div className="stat-label">{preventivo ? `Desde el último preventivo (${fecha(preventivo.fecha)})` : "Sin preventivo registrado"}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={colorAc ? { color: colorAc } : undefined}>
          {ultimaInsp?.nivel_aceite || "—"}
        </div>
        <div className="stat-label">Aceite en la última inspección{ultimaInsp ? ` (${fecha(ultimaInsp.fecha)})` : ""}</div>
      </div>
      <div className="stat-card">
        <div className="stat-value" style={proxima?.estado === "vencido" ? { color: "var(--rojo)" } : undefined}>
          {!proxima ? "—" : proxima.nunca ? "Nunca" : fecha(proxima.proxima)}
        </div>
        <div className="stat-label">{proxima?.nunca ? "Nunca inspeccionado" : "Próxima inspección"}</div>
      </div>
    </div>
  );
}

function TarjetaCompresor({ compresor, mantenimientos, proxima, onClick }) {
  const lista = mantenimientos.filter((m) => m.compresor_id === compresor.id);
  const actual = [...lista].sort((a, b) => Number(b.horometro) - Number(a.horometro))[0];
  const ultimaInsp = lista
    .filter((m) => m.tipo_mantenimiento === "Inspección" && m.nivel_aceite)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  const vencida = proxima?.estado === "vencido";
  return (
    <button type="button" className="card tarjeta-compresor" onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <b style={{ fontSize: 16 }}>{compresor.codigo}</b>
        {ultimaInsp && claseAceite(ultimaInsp.nivel_aceite) && (
          <span className={`badge ${claseAceite(ultimaInsp.nivel_aceite)}`}>Aceite: {ultimaInsp.nivel_aceite}</span>
        )}
      </div>
      {compresor.descripcion && <div className="muted" style={{ fontSize: 12, margin: "2px 0 8px" }}>{compresor.descripcion}</div>}
      <div style={{ fontSize: 13 }}>
        Horómetro: <b>{actual ? `${formatHoras(actual.horometro)} h` : "—"}</b>
      </div>
      <div style={{ fontSize: 13, marginTop: 2, color: vencida ? "var(--rojo)" : undefined, fontWeight: vencida ? 700 : 400 }}>
        {!proxima
          ? "Sin recordatorio de inspección"
          : proxima.nunca
            ? "Nunca inspeccionado"
            : vencida
              ? `Inspección vencida (${fecha(proxima.proxima)})`
              : `Próxima inspección: ${fecha(proxima.proxima)}`}
      </div>
    </button>
  );
}

// Gráfica del nivel de aceite (una sola serie; el color de cada punto
// repite el estado que ya dice el eje: verde bien, ámbar bajo, rojo muy
// bajo). Al pasar el mouse o tocar un punto se ve el detalle. En el
// celular, las últimas 6 inspecciones con letra más grande.
function GraficaAceite({ codigo, mantenimientos }) {
  const [activo, setActivo] = useState(null);
  const todos = mantenimientos
    .filter((m) => m.tipo_mantenimiento === "Inspección" && indiceAceite(m.nivel_aceite) !== null)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : Number(a.horometro) - Number(b.horometro)));
  const preventivos = mantenimientos.filter((m) => m.tipo_mantenimiento === "Mantenimiento preventivo");

  if (todos.length < 2) {
    return (
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 14.5 }}>Nivel de aceite — {codigo}</div>
        <div className="hint-text">
          La gráfica sale cuando haya al menos 2 inspecciones con el nivel de aceite escogido de la lista.
        </div>
      </div>
    );
  }

  const pc = todos.slice(-12);
  const cel = todos.slice(-6);
  const sel = activo ? todos.find((m) => m.id === activo) : null;

  return (
    <div className="card" style={{ paddingBottom: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 14.5 }}>Nivel de aceite — {codigo}</div>
      <div className="hint-text" style={{ margin: "0 0 6px" }}>
        Cada punto es una inspección. Pasa el mouse o toca un punto para ver el detalle.
      </div>
      <div className="solo-pc">
        <SvgAceite puntos={pc} preventivos={preventivos} activo={activo} setActivo={setActivo} codigo={codigo}
          W={1000} H={230} L={96} R={20} T={18} B={52} letra={15} letraX={13} radio={7} />
      </div>
      <div className="solo-cel">
        <SvgAceite puntos={cel} preventivos={preventivos} activo={activo} setActivo={setActivo} codigo={codigo}
          W={360} H={200} L={62} R={14} T={14} B={46} letra={12} letraX={10.5} radio={6} />
      </div>
      <div style={{ minHeight: 20, fontSize: 13, color: "var(--texto-suave)" }}>
        {sel ? (
          <>
            <b style={{ color: "var(--texto)" }}>{fecha(sel.fecha)}</b> · {sel.nivel_aceite}
            {sel.aceite_echado ? " · se le echó aceite" : ""} · {formatHoras(sel.horometro)} h · {sel.responsable}
          </>
        ) : null}
      </div>
    </div>
  );
}

function SvgAceite({ puntos, preventivos, activo, setActivo, codigo, W, H, L, R, T, B, letra, letraX, radio }) {
  const pw = W - L - R;
  const ph = H - T - B;
  const t0 = Date.parse(puntos[0].fecha);
  const t1 = Date.parse(puntos[puntos.length - 1].fecha);
  const x = (iso) => (t1 === t0 ? L + pw / 2 : L + (pw * (Date.parse(iso) - t0)) / (t1 - t0));
  const y = (i) => T + (ph * i) / (NIVELES_ACEITE.length - 1);
  const colorPunto = (i) => (i <= 1 ? "var(--verde)" : i === 2 ? "#c48221" : "var(--rojo)");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label={`Nivel de aceite del compresor ${codigo}`}>
      {NIVELES_ACEITE.map((n, i) => (
        <g key={n.valor}>
          <line x1={L} x2={W - R} y1={y(i)} y2={y(i)} stroke="var(--borde)" strokeWidth="1" />
          <text x={L - 8} y={y(i) + letra / 3} textAnchor="end" fontSize={letra} fill="var(--texto-suave)">
            {n.valor}
          </text>
        </g>
      ))}
      {preventivos
        .filter((p) => Date.parse(p.fecha) >= t0 && Date.parse(p.fecha) <= t1)
        .map((p) => (
          <g key={p.id}>
            <line x1={x(p.fecha)} x2={x(p.fecha)} y1={T} y2={T + ph} stroke="var(--texto-suave)" strokeWidth="1.5" strokeDasharray="5 5" />
            <text x={x(p.fecha) + 5} y={T + ph - 5} fontSize={letraX} fill="var(--texto-suave)">
              {fechaCorta(p.fecha)} preventivo
            </text>
          </g>
        ))}
      <polyline
        points={puntos.map((m) => `${x(m.fecha)},${y(indiceAceite(m.nivel_aceite))}`).join(" ")}
        fill="none"
        stroke="var(--texto)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {puntos.map((m) => {
        const iy = indiceAceite(m.nivel_aceite);
        return (
          <g
            key={m.id}
            onMouseEnter={() => setActivo(m.id)}
            onMouseLeave={() => setActivo(null)}
            onClick={() => setActivo(m.id)}
            style={{ cursor: "pointer" }}
          >
            {/* área para tocar más grande que el punto */}
            <circle cx={x(m.fecha)} cy={y(iy)} r={radio * 2.6} fill="transparent" />
            <circle cx={x(m.fecha)} cy={y(iy)} r={activo === m.id ? radio + 2 : radio} fill={colorPunto(iy)} stroke="var(--tarjeta)" strokeWidth="2.5" />
            <text x={x(m.fecha)} y={H - B + letraX + 8} textAnchor="middle" fontSize={letraX} fill="var(--texto-suave)">
              {fechaCorta(m.fecha)}
            </text>
            {m.aceite_echado && (
              <text x={x(m.fecha)} y={H - B + letraX * 2 + 14} textAnchor="middle" fontSize={letraX} fontWeight="700" fill="var(--texto)">
                + aceite
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PanelPersonalizar({ vista, onCambiar, onCerrar, supabase, miId }) {
  const [borrador, setBorrador] = useState(vista);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(nueva) {
    setGuardando(true);
    setError("");
    const { error: err } = await supabase
      .from("profiles")
      .update({ vista_historial_compresores: nueva })
      .eq("id", miId);
    setGuardando(false);
    if (err) return setError("No se pudo guardar. Falta correr migration_70.sql en Supabase.");
    onCambiar(nueva ? unirVista(nueva) : VISTA_NORMAL);
    onCerrar();
  }

  const fila = { display: "flex", gap: 8, alignItems: "center", margin: 0, padding: "7px 0", fontWeight: 500, fontSize: 13.5, borderTop: "1px solid var(--borde)" };
  const chk = { width: 17, height: 17, margin: 0 };

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 800, fontSize: 16 }}>Personalizar vista</div>
      <div className="hint-text" style={{ margin: "2px 0 10px" }}>
        Se guarda en tu cuenta: lo ves igual en la compu y en el teléfono. Solo tú y los administradores pueden cambiar la suya.
      </div>
      <div className="muted" style={{ fontWeight: 700, fontSize: 12 }}>ARRIBA</div>
      <label style={fila}>
        <input type="checkbox" style={chk} checked={borrador.resumen} onChange={(e) => setBorrador({ ...borrador, resumen: e.target.checked })} />
        Cuadritos de resumen
      </label>
      <label style={fila}>
        <input type="checkbox" style={chk} checked={borrador.grafica} onChange={(e) => setBorrador({ ...borrador, grafica: e.target.checked })} />
        Gráfica del aceite
      </label>
      <div className="muted" style={{ fontWeight: 700, fontSize: 12, marginTop: 12 }}>QUÉ DATOS VER DE CADA REGISTRO</div>
      <div className="muted" style={{ fontSize: 13, padding: "7px 0" }}>Fecha (siempre)</div>
      {COLUMNAS.map((c) => (
        <label key={c.key} style={fila}>
          <input
            type="checkbox"
            style={chk}
            checked={!!borrador.columnas[c.key]}
            onChange={(e) => setBorrador({ ...borrador, columnas: { ...borrador.columnas, [c.key]: e.target.checked } })}
          />
          {c.label}
        </label>
      ))}
      {error && <div className="error-box">{error}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={guardando} onClick={() => guardar(borrador)} style={{ marginTop: 0, width: "auto" }}>
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" className="btn secondary" disabled={guardando} onClick={() => guardar(null)} style={{ marginTop: 0, width: "auto" }}>
          Volver a como venía
        </button>
        <button type="button" className="btn secondary" disabled={guardando} onClick={onCerrar} style={{ marginTop: 0, width: "auto" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
