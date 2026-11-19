import { useEffect, useState } from "react";
import { svgQr } from "@/components/CompartirLink";

// V91 (maqueta v92, aprobada): el QR que se muestra en la tienda para que el
// instructor confirme que recibió el presupuesto. Vence a los 15 minutos.
export default function QrEntrega({ fechaId, curso, fecha, ops, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  async function nuevo() {
    setCargando(true);
    const j = await ops.pedirQrEntrega(fechaId);
    setDatos(j);
    setCargando(false);
  }

  useEffect(() => {
    nuevo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const expira = datos?.expiraEn ? new Date(datos.expiraEn).getTime() : 0;
  const restante = expira - ahora;
  const vencido = !!datos && restante <= 0;
  const mm = String(Math.max(0, Math.floor(restante / 60000))).padStart(2, "0");
  const ss = String(Math.max(0, Math.floor((restante % 60000) / 1000))).padStart(2, "0");
  const hora = expira ? new Date(expira).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "";

  return (
    <div role="dialog" aria-label="QR para el instructor" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
      <div className="card" style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
        <b>Entregar al instructor</b>
        <div className="hint-text">
          {curso || "Curso"} · {fecha}
        </div>
        {cargando && <div className="hint-text" style={{ marginTop: 12 }}>Preparando el QR…</div>}
        {datos && !vencido && (
          <>
            <div style={{ width: 220, margin: "12px auto" }} dangerouslySetInnerHTML={{ __html: svgQr(datos.url, 6) }} />
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              {mm}:{ss}
            </div>
            <div className="hint-text">Vence a las {hora}. El instructor lo escanea con su celular y confirma.</div>
          </>
        )}
        {vencido && <div className="hint-text" style={{ marginTop: 12 }}>Este QR ya venció. Genera uno nuevo.</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <button className="btn btn-primary vj-mini" onClick={nuevo} disabled={cargando}>
            Generar QR nuevo
          </button>
          <button className="btn secondary vj-mini" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
