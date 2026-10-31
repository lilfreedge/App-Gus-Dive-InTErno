import { formatFecha } from "@/lib/format";
import { IconClipboard } from "./icons";

// V50 -- Un código que llegó por Solicitudes al almacén, como movimiento
// (pedido explícito, 30-oct-2026: "necesito poder ver también los
// movimientos de solicitud, o sea que figuren ahí ya después que uno la
// reciba"; maqueta-v50-movimientos.html, "11. no. que solo me salga y ya",
// "12. si": sin colores ni filtros nuevos en la pantalla del código, y
// también en Movimientos). Sale solo cuando el código se marcó como
// recibido. `item` es una fila de solicitudes_almacen_items con
// `solicitud` (folio, quién la pidió, nota) adentro.
export default function SolicitudRecibidaItem({ item, conIcono = false }) {
  const s = item.solicitud || {};
  return (
    <div className="list-item" data-buscar="">
      <div className="list-item-top">
        <span className="list-item-title">
          {conIcono && <IconClipboard size={14} />}
          <span className="folio-tag">Solicitud #{s.folio ?? "?"}</span>
          {item.codigo_snapshot}
          <span className="badge">Llegó del almacén</span>
        </span>
        <span className="list-item-qty">{item.cantidad}</span>
      </div>
      <div className="list-item-meta">
        {item.recibido_por_nombre ? `Recibió: ${item.recibido_por_nombre} · ` : ""}
        {formatFecha(item.recibido_at)}
        {s.nombre_usuario_snapshot ? ` · Pidió: ${s.nombre_usuario_snapshot}` : ""}
      </div>
      {item.descripcion_snapshot && conIcono && <div className="list-item-meta">{item.descripcion_snapshot}</div>}
      {s.nota && <div className="list-item-note">{s.nota}</div>}
    </div>
  );
}
