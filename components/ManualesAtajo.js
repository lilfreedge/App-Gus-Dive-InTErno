import { tituloManual, linkManual } from "@/lib/manuales";

// V51 -- Atajo sutil a los manuales de un equipo (fichas de App Interno).
// Solo sale si hay manuales para ese modelo.
export default function ManualesAtajo({ manuales = [], titulo = false }) {
  if (!manuales.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      {titulo && <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--texto-suave)" }}>Manuales</div>}
      {manuales.map((m) => (
        <div key={m.id}>
          <a href={linkManual(m)} target="_blank" rel="noreferrer" className="manual-atajo">
            <span className={`manual-ic${m.url ? " link" : ""}`}>{m.url ? "LINK" : "PDF"}</span>
            Manual del {tituloManual(m)} ›
          </a>
        </div>
      ))}
    </div>
  );
}
