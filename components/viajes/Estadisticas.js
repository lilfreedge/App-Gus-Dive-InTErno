"use client";

import { useState } from "react";
import { rd, MES_CORTO, MESES, fechaObj, fechaCorta, resumenViaje, numerosViaje, estadoViaje, hoyISO, sumarDias } from "@/lib/viajes/modelo";

// V42: sale solo de los viajes del app que ya pasaron (cerrados o por
// cerrar). Los de los sheets viejos se suman cuando se importen.
const AZUL = "#2a78d6"; // serie 1
const NARANJA = "#eb6834"; // serie 2
const corto = (n) => n.split(/[,(]/)[0].trim();
const k = (n) => (Math.abs(n) >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

function paso(max) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const m = [1, 2, 2.5, 5, 10].find((x) => x * p >= raw) * p;
  return m;
}
// Columna con la punta redondeada (4px) y cuadrada en la base.
const columna = (x, y, w, h) => {
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div className="ch-tip" style={{ left: tip.x, top: tip.y }}>
      {tip.lineas.map((l, i) => (
        <div key={i} className={i === 0 ? "ch-tip-t" : ""}>
          {l}
        </div>
      ))}
    </div>
  );
}

// Columnas de una o dos series.
function Columnas({ datos, series, alto = 210, formato = k }) {
  const [tip, setTip] = useState(null);
  if (!datos.length) return <div className="hint-text">Sin datos todavía.</div>;
  const W = Math.max(320, datos.length * (series.length * 18 + 22) + 50);
  const H = alto;
  const izq = 44,
    abajo = 26,
    arriba = 14;
  const max = Math.max(1, ...datos.flatMap((d) => series.map((s) => d[s.k])));
  const st = paso(max);
  const tope = Math.ceil(max / st) * st;
  const y = (v) => arriba + (H - arriba - abajo) * (1 - v / tope);
  const banda = (W - izq - 8) / datos.length;
  const bw = Math.min(18, (banda - 10) / series.length - 2);
  const ticks = [];
  for (let t = 0; t <= tope; t += st) ticks.push(t);
  return (
    <div className="ch-wrap" onMouseLeave={() => setTip(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: Math.min(W, 520), display: "block" }} role="img">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={izq} x2={W - 4} y1={y(t)} y2={y(t)} stroke="var(--ch-grid)" strokeWidth="1" />
            <text x={izq - 6} y={y(t) + 4} textAnchor="end" className="ch-eje">
              {formato(t)}
            </text>
          </g>
        ))}
        {datos.map((d, i) => {
          const x0 = izq + i * banda + (banda - (bw + 2) * series.length + 2) / 2;
          return (
            <g key={i}>
              {series.map((s, j) => {
                const h = Math.max(0, y(0) - y(d[s.k]));
                return <path key={s.k} d={columna(x0 + j * (bw + 2), y(d[s.k]), bw, h)} fill={s.color} />;
              })}
              <text x={izq + i * banda + banda / 2} y={H - 8} textAnchor="middle" className="ch-eje">
                {d.label}
              </text>
              <rect
                x={izq + i * banda}
                y={arriba}
                width={banda}
                height={H - arriba - abajo}
                fill="transparent"
                onMouseEnter={(e) => {
                  const r = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                  const esc = r.width / W;
                  setTip({ x: (izq + i * banda + banda / 2) * esc, y: y(Math.max(...series.map((s) => d[s.k]))) * esc - 8, lineas: d.tip });
                }}
              />
            </g>
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

// Barras horizontales (una serie), con el valor en la punta.
function Barras({ datos, formato }) {
  const [tip, setTip] = useState(null);
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="ch-hbars" onMouseLeave={() => setTip(null)}>
      {datos.map((d) => (
        <div key={d.label} className="ch-hrow" onMouseEnter={(e) => setTip({ x: e.currentTarget.offsetLeft + 140, y: e.currentTarget.offsetTop - 4, lineas: d.tip })}>
          <div className="ch-hlabel">{d.label}</div>
          <div className="ch-htrack">
            <div className="ch-hbar" style={{ width: `${Math.max(2, (d.valor / max) * 100)}%`, background: AZUL }} />
            <span className="ch-hval">{formato(d.valor)}</span>
          </div>
        </div>
      ))}
      <Tip tip={tip} />
    </div>
  );
}

export function Estadisticas({ db, ir }) {
  const hayDatos = db.viajes.some((v) => ["cerrado", "realizado"].includes(estadoViaje(v)));
  const [periodo, setPeriodo] = useState("12m");
  const [tabla, setTabla] = useState(false);
  // Viajes cerrados en el app + histórico (ejemplo)
  const delApp = db.viajes
    .filter((v) => ["cerrado", "realizado"].includes(estadoViaje(v)))
    .map((v) => {
      const r = resumenViaje(db, v);
      const n = numerosViaje(db, v);
      return { fecha: v.fecha, nombre: v.nombre, buzos: r.buzos.length, asistieron: r.ins.filter((x) => x.rol !== "staff" && x.asistio).length, ganancia: (v.gastos || []).length ? n.gananciaReal : 0, id: v.id };
    });
  const HOY = hoyISO();
  const hace12 = sumarDias(HOY, -365);
  const desde = periodo === "12m" ? hace12 : periodo === "anio" ? `${HOY.slice(0, 4)}-01-01` : "2000-01-01";
  const todos = delApp.filter((v) => v.fecha >= desde && v.fecha <= HOY).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const total = todos.reduce((a, v) => a + v.ganancia, 0);
  const buzos = todos.reduce((a, v) => a + v.asistieron, 0);
  const inscritos = todos.reduce((a, v) => a + v.buzos, 0);
  const noShow = inscritos ? Math.round(((inscritos - buzos) / inscritos) * 100) : 0;

  // por mes
  const meses = [];
  const ini = fechaObj(desde < hace12 ? todos[0]?.fecha || HOY : desde);
  for (let d = new Date(ini.getFullYear(), ini.getMonth(), 1); d <= fechaObj(HOY); d.setMonth(d.getMonth() + 1)) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const vs = todos.filter((v) => v.fecha.startsWith(key));
    const g = vs.reduce((a, v) => a + v.ganancia, 0);
    meses.push({
      label: MES_CORTO[d.getMonth()].slice(0, 3),
      g,
      tip: [`${MESES[d.getMonth()]} ${d.getFullYear()}`, `Ganancia real: ${rd(g)}`, `${vs.length} viaje${vs.length === 1 ? "" : "s"}`],
    });
  }
  // por tipo
  const tipos = {};
  for (const v of todos) {
    const t = corto(v.nombre);
    tipos[t] = tipos[t] || { n: 0, g: 0, b: 0 };
    tipos[t].n++;
    tipos[t].g += v.ganancia;
    tipos[t].b += v.asistieron;
  }
  const porTipo = Object.entries(tipos)
    .map(([t, x]) => ({ label: t, valor: Math.round(x.g / x.n), n: x.n, b: x.b, total: x.g, tip: [t, `${x.n} viaje${x.n === 1 ? "" : "s"}`, `Promedio por viaje: ${rd(x.g / x.n)}`, `Total: ${rd(x.g)}`, `Buzos por viaje: ${Math.round(x.b / x.n)}`] }))
    .sort((a, b) => b.valor - a.valor);
  const ultimos = todos.slice(-12).map((v) => ({
    label: `${fechaObj(v.fecha).getDate()} ${MES_CORTO[fechaObj(v.fecha).getMonth()].slice(0, 3).toLowerCase()}`,
    i: v.buzos,
    a: v.asistieron,
    tip: [corto(v.nombre), fechaCorta(v.fecha), `Inscritos: ${v.buzos}`, `Asistieron: ${v.asistieron}`],
  }));
  // buzos frecuentes (del app)
  const cuenta = {};
  db.inscripciones.filter((x) => x.rol === "buzo" && x.estado === "inscrito").forEach((x) => (cuenta[x.buzoId] = (cuenta[x.buzoId] || 0) + 1));
  const frecuentes = Object.entries(cuenta)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, n]) => ({ b: db.buzos.find((y) => y.id === id), n }));

  return (
    <>
      <h1 className="page-title">Estadísticas</h1>
      <div className="hint-text" style={{ marginBottom: 10 }}>
        Solo tú y los administradores. Sale de los viajes que ya pasaron (ganancia real = cobrado − gastos reales que pongan en Números).
      </div>
      {!hayDatos && (
        <div className="card aviso-box">Todavía no hay viajes pasados en el app. Los charts se llenan solos a medida que se hagan y se cierren los viajes.</div>
      )}
      <div className="ch-filtros">
        {[
          ["12m", "Últimos 12 meses"],
          ["anio", "Este año"],
          ["todo", "Todo"],
        ].map(([kk, t]) => (
          <button key={kk} className={`vj-filtro${periodo === kk ? " sel" : ""}`} onClick={() => setPeriodo(kk)}>
            {t}
          </button>
        ))}
        <button className={`vj-filtro${tabla ? " sel" : ""}`} onClick={() => setTabla(!tabla)} style={{ marginLeft: "auto" }}>
          {tabla ? "Ver charts" : "Ver como tabla"}
        </button>
      </div>
      <div className="ch-tiles">
        <div>
          <span>Viajes</span>
          <b>{todos.length}</b>
        </div>
        <div>
          <span>Buzos que fueron</span>
          <b>{buzos}</b>
        </div>
        <div>
          <span>Ganancia real</span>
          <b>{rd(total)}</b>
        </div>
        <div>
          <span>Promedio por viaje</span>
          <b>{rd(todos.length ? total / todos.length : 0)}</b>
        </div>
        <div>
          <span>No vinieron</span>
          <b>{noShow}%</b>
        </div>
      </div>

      {tabla ? (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="vj-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Viaje</th>
                <th>Inscritos</th>
                <th>Asistieron</th>
                <th>Ganancia real</th>
              </tr>
            </thead>
            <tbody>
              {todos
                .slice()
                .reverse()
                .map((v) => (
                  <tr key={v.fecha + v.nombre}>
                    <td>{fechaCorta(v.fecha)}</td>
                    <td>
                      {v.id ? (
                        <a className="vj-link" onClick={() => ir(`viaje:${v.id}`)}>
                          {corto(v.nombre)}
                        </a>
                      ) : (
                        corto(v.nombre)
                      )}
                    </td>
                    <td>{v.buzos}</td>
                    <td>{v.asistieron}</td>
                    <td>{rd(v.ganancia)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="card ch-card">
            <div className="ch-t">Ganancia real por mes</div>
            <Columnas datos={meses} series={[{ k: "g", color: AZUL }]} />
          </div>
          <div className="card ch-card">
            <div className="ch-t">¿Qué viaje deja más? · ganancia promedio por viaje</div>
            <Barras datos={porTipo} formato={(v) => rd(v)} />
            <div className="hint-text" style={{ marginTop: 6 }}>
              Pasa el mouse por una barra: cuántas veces se hizo, el total y los buzos por viaje.
            </div>
          </div>
          <div className="card ch-card">
            <div className="ch-t">Buzos por viaje · últimos {ultimos.length}</div>
            <div className="ch-leyenda">
              <span>
                <i style={{ background: AZUL }} /> Inscritos
              </span>
              <span>
                <i style={{ background: NARANJA }} /> Asistieron
              </span>
            </div>
            <Columnas datos={ultimos} series={[{ k: "i", color: AZUL }, { k: "a", color: NARANJA }]} formato={(v) => String(v)} />
          </div>
        </>
      )}
      <div className="card ch-card">
        <div className="ch-t">Buzos que más viajan</div>
        {frecuentes.map(({ b, n }) => (
          <div key={b.id} className="vj-dato">
            <a className="vj-link" onClick={() => ir(`buzo:${b.id}`)}>
              {b.nombre}
            </a>
            <b>
              {n} viaje{n === 1 ? "" : "s"}
            </b>
          </div>
        ))}
      </div>
    </>
  );
}
