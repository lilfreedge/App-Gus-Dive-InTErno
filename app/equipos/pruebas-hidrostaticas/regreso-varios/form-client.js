"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MesAnioSelector, { mesAnioCompleto } from "@/components/MesAnioSelector";
import { hoyLocalISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { claseDiasAfuera, diasEntreFechas } from "@/lib/envios-hidrostatica";

// V33 -- ver page.js. Por defecto vienen todos marcados y "Aprobado".
export default function RegresoVariosForm({ envios }) {
  const router = useRouter();
  const supabase = createClient();
  const [marcados, setMarcados] = useState(() => Object.fromEntries(envios.map((e) => [e.id, true])));
  const [resultados, setResultados] = useState(() => Object.fromEntries(envios.map((e) => [e.id, "Aprobado"])));
  const [notas, setNotas] = useState({});
  const [conNota, setConNota] = useState({});
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [fechaPrueba, setFechaPrueba] = useState("");
  const [hoy, setHoy] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const h = hoyLocalISO();
    setHoy(h);
    setFechaRegreso(h);
    setFechaPrueba(h.slice(0, 7));
  }, []);

  const elegidos = envios.filter((e) => marcados[e.id]);
  const rechazados = elegidos.filter((e) => resultados[e.id] === "Rechazado");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const h = hoyLocalISO();
    if (elegidos.length === 0) return setError("Marca al menos un tanque.");
    if (!fechaRegreso) return setError("Pon la fecha de regreso.");
    if (fechaRegreso > h) return setError("La fecha de regreso no puede ser en el futuro.");
    const antes = elegidos.find((x) => fechaRegreso < x.fecha_envio);
    if (antes) {
      return setError(
        `La fecha de regreso no puede ser antes del envío de ${antes.tanque_codigo_snapshot} (${formatFechaDDMMAAAADeDate(antes.fecha_envio)}).`
      );
    }
    if (!mesAnioCompleto(fechaPrueba)) return setError("Pon el mes y el año de la prueba.");
    if (fechaPrueba > h.slice(0, 7)) return setError("La fecha de la prueba no puede ser en el futuro.");

    setLoading(true);
    const { error: err } = await supabase.rpc("registrar_regresos_hidrostatica", {
      p_fecha_regreso: fechaRegreso,
      p_fecha_prueba: `${fechaPrueba}-01`,
      p_items: elegidos.map((x) => ({
        envio_id: x.id,
        resultado: resultados[x.id],
        nota: (notas[x.id] || "").trim() || null,
      })),
    });
    setLoading(false);
    if (err) {
      setError(
        /does not exist|function/i.test(err.message || "")
          ? "Falta correr migration_65.sql en Supabase."
          : err.message || "No se pudo guardar. Intenta de nuevo."
      );
      return;
    }
    router.push("/equipos/pruebas-hidrostaticas");
    router.refresh();
  }

  const botonResultado = (envio, valor) => {
    const activo = resultados[envio.id] === valor;
    const color = valor === "Aprobado" ? "var(--verde)" : "var(--rojo)";
    return (
      <button
        type="button"
        onClick={() => setResultados((r) => ({ ...r, [envio.id]: valor }))}
        aria-pressed={activo}
        style={{
          border: `1px solid ${color}`,
          borderRadius: 7,
          padding: "4px 10px",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          background: activo ? color : "transparent",
          color: activo ? "#fff" : color,
        }}
      >
        {valor}
      </button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="card">
      <label style={{ marginTop: 0 }}>¿Cuáles volvieron?</label>
      <div style={{ border: "1px solid var(--borde)", borderRadius: 10, padding: "0 12px" }}>
        {envios.map((x) => {
          const dias = hoy ? diasEntreFechas(x.fecha_envio, hoy) : 0;
          return (
            <label
              key={x.id}
              className="list-item"
              style={{ display: "block", margin: 0, cursor: "pointer", fontWeight: "normal" }}
            >
              <div className="list-item-top">
                <span className="list-item-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!marcados[x.id]}
                    onChange={(e) => setMarcados((m) => ({ ...m, [x.id]: e.target.checked }))}
                    style={{ width: 17, height: 17, margin: 0 }}
                  />
                  {x.tanque_codigo_snapshot}
                </span>
                <span className={`badge ${claseDiasAfuera(dias)}`}>
                  Afuera hace {dias} día{dias === 1 ? "" : "s"}
                </span>
              </div>
              <div className="list-item-meta">Enviado el {formatFechaDDMMAAAADeDate(x.fecha_envio)}</div>
            </label>
          );
        })}
      </div>

      <label htmlFor="fecha_regreso">
        Fecha de regreso <span className="req">*</span>
      </label>
      <input id="fecha_regreso" type="date" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} />

      <label htmlFor="fecha_prueba">
        Mes y año de la prueba <span className="req">*</span>
      </label>
      <MesAnioSelector
        id="fecha_prueba"
        valor={fechaPrueba}
        onChange={setFechaPrueba}
        anioActual={(fechaRegreso || hoyLocalISO()).slice(0, 4)}
        aniosAtras={2}
      />
      <div className="hint-text">La fecha de regreso y el mes de la prueba son los mismos para todos. El resultado es por tanque.</div>

      {elegidos.length > 0 && (
        <>
          <label>Resultado de cada uno</label>
          <div style={{ border: "1px solid var(--borde)", borderRadius: 10, padding: "0 12px" }}>
            {elegidos.map((x) => (
              <div className="list-item" key={x.id}>
                <div className="list-item-top">
                  <span className="list-item-title">{x.tanque_codigo_snapshot}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {botonResultado(x, "Aprobado")}
                    {botonResultado(x, "Rechazado")}
                  </div>
                </div>
                {conNota[x.id] ? (
                  <input
                    type="text"
                    value={notas[x.id] || ""}
                    onChange={(e) => setNotas((n) => ({ ...n, [x.id]: e.target.value }))}
                    placeholder="Nota (opcional)"
                    style={{ marginTop: 8 }}
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setConNota((c) => ({ ...c, [x.id]: true }))}
                    style={{ border: "none", background: "none", padding: 0, marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--azul-claro)", cursor: "pointer" }}
                  >
                    + Nota
                  </button>
                )}
                {resultados[x.id] === "Rechazado" && (
                  <div className="error-box" style={{ marginTop: 8, fontSize: 12.5 }}>
                    {x.tanque_codigo_snapshot} se va a <b>inactivar</b> (rechazado en PH). Su historial se queda.
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {elegidos.length > rechazados.length && (
        <div className="aviso-box" style={{ marginTop: 12, fontSize: 12.5 }}>
          A los aprobados se les anota también la inspección visual con la fecha de regreso
          {fechaRegreso ? ` (${formatFechaDDMMAAAADeDate(fechaRegreso)})` : ""}.
        </div>
      )}

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading || elegidos.length === 0} style={{ marginTop: 16 }}>
        {loading
          ? "Guardando..."
          : `Registrar regreso de ${elegidos.length} tanque${elegidos.length === 1 ? "" : "s"}`}
      </button>
    </form>
  );
}
