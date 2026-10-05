"use client";

import { useMemo, useState } from "react";
import TarjetaBitacoraMovimiento from "@/components/TarjetaBitacoraMovimiento";
import BorrarTodoHistorialButton from "@/components/BorrarTodoHistorialButton";
import { formatFecha } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// Agrupado por orden, con buscador por No. de orden o cliente (feedback en
// vivo, 1-oct-2026, pedido explícito: "quiero conectar esto con 'bitacora
// movimientos en ordenes'. que dentro de 'bitacora movimientos en
// ordenes' haya una barra de search para buscar no. de orden. Y que cada
// orden sea un boton y dentro aparezcan todos sus movimientos. Y pon los
// botones mas pequenos, se ven muy voluminosos") -- antes esta pantalla
// mostraba una tarjeta grande (component TarjetaBitacoraMovimiento, hasta
// 300 de una) por cada EDICIÓN individual, sin importar si varias eran de
// la misma orden. Ahora se agrupan por `registro_id` (la orden): cada
// orden es una fila compacta (estilo `.list-item`, no una `.card` entera)
// que se puede abrir/cerrar, y adentro aparecen sus movimientos con el
// mismo `TarjetaBitacoraMovimiento` de siempre (reutilizado tal cual, sin
// tocar esa pantalla). `cambios` ya llega ordenado por fecha descendente
// desde el server (page.js) -- se preserva ese orden tanto entre grupos
// (el grupo de la orden con el movimiento más reciente va primero) como
// dentro de cada grupo.
//
// Búsqueda también por nombre de cliente (feedback sobre v50, pedido
// explícito: "pon que se pueda buscar por nombre también, no solo numero
// de orden") -- antes el buscador solo miraba `noOrden`.
export default function BitacoraMovimientosClient({ cambios, esTitular }) {
  const [q, setQ] = useState("");
  const [abiertos, setAbiertos] = useState(() => new Set());

  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const c of cambios) {
      const key = c.registro_id;
      if (!mapa.has(key)) {
        const d = c.datos_anteriores || {};
        mapa.set(key, {
          registroId: key,
          noOrden: d.no_orden_fisico ?? d.folio ?? "?",
          cliente: d.cliente_nombre_snapshot || "",
          equipo: tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro) || "",
          cambios: [],
        });
      }
      mapa.get(key).cambios.push(c);
    }
    return Array.from(mapa.values());
  }, [cambios]);

  const filtrados = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return grupos;
    return grupos.filter(
      (g) => String(g.noOrden).toLowerCase().includes(query) || g.cliente.toLowerCase().includes(query)
    );
  }, [grupos, q]);

  function alternar(registroId) {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(registroId)) next.delete(registroId);
      else next.add(registroId);
      return next;
    });
  }

  return (
    <div>
      {esTitular && (
        <div style={{ marginBottom: 14 }}>
          <BorrarTodoHistorialButton
            filtro={{ tabla: "ordenes_equipos", accion: "editar" }}
            etiqueta="toda la bitácora de movimientos"
          />
        </div>
      )}

      <input
        type="text"
        placeholder="Buscar No. de orden o cliente..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginTop: 0, marginBottom: 14 }}
      />

      {grupos.length === 0 ? (
        <div className="empty">Todavía no hay ediciones registradas.</div>
      ) : filtrados.length === 0 ? (
        <div className="empty">Ninguna orden coincide con esa búsqueda (por No. de orden o cliente).</div>
      ) : (
        filtrados.map((g) => {
          const abierto = abiertos.has(g.registroId);
          return (
            <div key={g.registroId} className="card" style={{ padding: 14 }}>
              <button
                type="button"
                onClick={() => alternar(g.registroId)}
                style={{
                  all: "unset",
                  cursor: "pointer",
                  display: "flex",
                  width: "100%",
                  boxSizing: "border-box",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div>
                  <div className="list-item-title">No. {g.noOrden}</div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    {[g.cliente, g.equipo].filter(Boolean).join(" · ")}
                  </div>
                  <div className="hint-text" style={{ marginTop: 2 }}>
                    {g.cambios.length} movimiento{g.cambios.length === 1 ? "" : "s"} · más reciente: {formatFecha(g.cambios[0].created_at)}
                  </div>
                </div>
                <span style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>▾</span>
              </button>

              {abierto && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {g.cambios.map((c) => (
                    <TarjetaBitacoraMovimiento key={c.id} cambio={c} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
