"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MesAnioSelector, { mesAnioCompleto } from "@/components/MesAnioSelector";
import { hoyLocalISO } from "@/lib/fechas";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

export default function RegresoForm({ envio }) {
  const router = useRouter();
  const supabase = createClient();
  const [fechaRegreso, setFechaRegreso] = useState("");
  const [fechaPrueba, setFechaPrueba] = useState("");
  const [resultado, setResultado] = useState("Aprobado");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hoy = hoyLocalISO();
    setFechaRegreso(hoy);
    setFechaPrueba(hoy.slice(0, 7));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const hoy = hoyLocalISO();
    if (!fechaRegreso) return setError("Pon la fecha de regreso.");
    if (fechaRegreso < envio.fecha_envio) return setError("La fecha de regreso no puede ser antes del envío.");
    if (fechaRegreso > hoy) return setError("La fecha de regreso no puede ser en el futuro.");
    if (!mesAnioCompleto(fechaPrueba)) return setError("Pon el mes y el año de la prueba.");
    if (fechaPrueba > hoy.slice(0, 7)) return setError("La fecha de la prueba no puede ser en el futuro.");

    setLoading(true);
    const { error: err } = await supabase.rpc("registrar_prueba_hidrostatica", {
      p_tanque_id: envio.tanque_id,
      p_fecha_prueba: `${fechaPrueba}-01`,
      p_resultado: resultado,
      p_nota: nota.trim() || null,
      p_envio_id: envio.id,
      p_fecha_regreso: fechaRegreso,
    });
    setLoading(false);
    if (err) {
      setError(err.message || "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    router.push("/equipos/pruebas-hidrostaticas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <label htmlFor="fecha_regreso" style={{ marginTop: 0 }}>
        Fecha de regreso <span className="req">*</span>
      </label>
      <input id="fecha_regreso" type="date" value={fechaRegreso} onChange={(e) => setFechaRegreso(e.target.value)} />

      <label htmlFor="fecha_prueba">
        Fecha de la prueba (mes y año) <span className="req">*</span>
      </label>
      <MesAnioSelector
        id="fecha_prueba"
        valor={fechaPrueba}
        onChange={setFechaPrueba}
        anioActual={(fechaRegreso || hoyLocalISO()).slice(0, 4)}
        aniosAtras={2}
      />

      <label>
        Resultado <span className="req">*</span>
      </label>
      <div className="radio-pills">
        <label>
          <input type="radio" name="resultado" checked={resultado === "Aprobado"} onChange={() => setResultado("Aprobado")} />
          Aprobado
        </label>
        <label style={resultado === "Rechazado" ? { borderColor: "var(--rojo)", color: "var(--rojo)" } : undefined}>
          <input type="radio" name="resultado" checked={resultado === "Rechazado"} onChange={() => setResultado("Rechazado")} />
          Rechazado
        </label>
      </div>

      {resultado === "Aprobado" ? (
        <div className="success-box">
          ✓ Junto con la prueba se anota también la <b>inspección visual</b> del tanque, con la fecha de regreso
          {fechaRegreso ? ` (${formatFechaDDMMAAAADeDate(fechaRegreso)})` : ""}. La próxima inspección se cuenta desde ahí.
        </div>
      ) : (
        <div className="error-box">
          Al guardar, <b>{envio.tanque_codigo_snapshot} se inactiva</b>: ya no sale para usarse ni en las listas de
          pendientes. Su historial se queda. Lo puedes editar y reactivar en Base de datos › Tanques.
        </div>
      )}

      <label htmlFor="nota">Nota</label>
      <textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Cualquier detalle extra (opcional)" />

      {error && <div className="error-box">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Guardando..." : "Guardar regreso y prueba"}
      </button>
    </form>
  );
}
