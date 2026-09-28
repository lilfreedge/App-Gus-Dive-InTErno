"use client";

import Link from "next/link";
import { useState } from "react";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import { formatFecha } from "@/lib/format";
import { filasOrden } from "@/lib/historial-ordenes";

// Tarjeta de "Bitácora movimientos en órdenes" con el detalle de campos
// colapsado por default (28-sep-2026, pedido explícito: "pon las
// ediciones que figuren en la bitacora que esten en un boton, para que
// no se vea todo eso asi a lo loco") -- antes cada tarjeta mostraba de
// una vez la tabla completa Campo/Antes/Después (hasta ~15 filas), una
// tras otra en toda la lista. Ahora arranca cerrada y se abre con un
// botón "Ver cambios", mismo patrón de acordeón que "Ver mi actividad"
// en Mi Perfil (components/MiActividadClientes.js). Quién editó y
// cuándo se dejan siempre visibles (sin abrir nada) para poder repasar
// la lista rápido; el link a la orden actual también queda afuera.
export default function TarjetaBitacoraMovimiento({ cambio }) {
  const [abierto, setAbierto] = useState(false);
  const d = cambio.datos_anteriores || {};
  const dn = cambio.datos_nuevos || null;
  const filas = filasOrden(d, dn);
  const titulo = `Orden No. ${d.no_orden_fisico ?? d.folio ?? "?"} editada`;

  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">{titulo}</div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <div className="hint-text" style={{ marginTop: 2 }}>
        {cambio.full_name} · {formatFecha(cambio.created_at)}
      </div>

      <button
        type="button"
        className="btn secondary"
        style={{ width: "100%", justifyContent: "space-between", display: "flex", marginTop: 10 }}
        onClick={() => setAbierto((v) => !v)}
      >
        <span>{abierto ? "Ocultar cambios" : "Ver cambios"}</span>
        <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>

      {abierto && (
        <table className="table-mini" style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Antes</th>
              <th>Después</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.label} className={f.antes !== f.despues ? "cambio-resaltado" : ""}>
                <td>{f.label}</td>
                <td>{f.antes}</td>
                <td>{f.despues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Link
        href={`/app-clientes/ordenes/${cambio.registro_id}`}
        style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
      >
        Ver orden actual →
      </Link>
    </div>
  );
}
