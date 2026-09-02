import RegistroActions from "./RegistroActions";
import { formatFecha } from "@/lib/format";

// Lista de salidas reutilizada por /salidas y por "Ver movimientos" del
// catálogo (filtrado por artículo).
export default function SalidasList({ salidas, puedeEditar }) {
  if (!salidas || salidas.length === 0) {
    return <div className="empty">Aún no hay salidas registradas.</div>;
  }

  return (
    <div>
      {salidas.map((s) => (
        <div className="list-item" key={s.id}>
          <div className="list-item-top">
            <span className="list-item-title">
              <span className="folio-tag">#{s.folio}</span>
              {s.articulo}
              <span className="badge">{s.motivo}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="list-item-qty">x{s.cantidad}</span>
              {puedeEditar && (
                <RegistroActions
                  tabla="salidas"
                  registro={s}
                  editHref={`/salidas/${s.id}/editar`}
                />
              )}
            </div>
          </div>
          <div className="list-item-meta">
            {s.full_name} · {formatFecha(s.created_at)}
            {s.autorizado_por ? ` · Autorizó: ${s.autorizado_por}` : ""}
          </div>
          {s.nota && <div className="list-item-note">{s.nota}</div>}
        </div>
      ))}
    </div>
  );
}
