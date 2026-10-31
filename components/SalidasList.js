import RegistroActions from "./RegistroActions";
import { formatFecha } from "@/lib/format";
import SolicitudRecibidaItem from "./SolicitudRecibidaItem";

// Lista de salidas reutilizada por /salidas y por "Ver movimientos" del
// catálogo (filtrado por artículo).
// V50 -- `recibidos` (solo en "Movimientos de" un código): lo que llegó de
// ese código por Solicitudes al almacén, mezclado con las salidas por fecha.
export default function SalidasList({ salidas, puedeEditar, recibidos = null }) {
  const filas = [
    ...(salidas || []).map((s) => ({ tipo: "salida", fecha: s.created_at, s })),
    ...(recibidos || []).map((r) => ({ tipo: "recibido", fecha: r.recibido_at, r })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (filas.length === 0) {
    return <div className="empty">{recibidos ? "Aún no hay movimientos de este código." : "Aún no hay salidas registradas."}</div>;
  }

  return (
    <div>
      {filas.map(({ tipo, s, r }) =>
        tipo === "recibido" ? (
          <SolicitudRecibidaItem key={`r-${r.id}`} item={r} />
        ) : (
        <div className="list-item" key={s.id} data-buscar="">
          <div className="list-item-top">
            <span className="list-item-title">
              <span className="folio-tag">#{s.folio}</span>
              {s.articulo}
              <span className="badge">{s.motivo}</span>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="list-item-qty">{s.cantidad}</span>
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
        )
      )}
    </div>
  );
}
