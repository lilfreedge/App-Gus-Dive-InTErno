"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_EQUIPO_PROCESOS, requiereVerificacion } from "@/lib/procesos-ordenes";
import { tipoEquipoDisplay } from "@/lib/tipo-equipo";

// "Procesos órdenes" (28-sep-2026, pedido explícito: "agrega una seccion
// de 'procesos ordenes' para quitar el paso de 'verificado por' en los
// equipos que le quite el check. Para quitar el paso de 'verificado por'
// en los equipos que le quite el check" -- confirmado en el chat que se
// refiere al paso "Verificado por" del Seguimiento). Checkbox marcado =
// comportamiento de siempre (ese tipo de equipo sigue necesitando que el
// Titular/Administrador lo verifique antes de poder notificar al
// cliente/cerrar la orden); al desmarcarlo, las órdenes de ese tipo se
// saltan ese paso -- ver requiereVerificacion() en lib/procesos-ordenes.js
// y su uso en el wizard de "Actualizar estado de orden".
export default function ProcesosOrdenesClientes({ ajustes }) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingTipo, setLoadingTipo] = useState(null);
  const [error, setError] = useState("");

  async function toggle(tipo, valor) {
    setLoadingTipo(tipo);
    setError("");
    const nuevaConfig = { ...(ajustes?.verificacion_requerida || {}), [tipo]: valor };
    const { error: err } = await supabase
      .from("ajustes_app_clientes")
      .update({ verificacion_requerida: nuevaConfig, updated_at: new Date().toISOString() })
      .eq("id", true);
    setLoadingTipo(null);
    if (err) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <p className="hint-text" style={{ marginTop: 0, marginBottom: 10 }}>
        Por tipo de equipo: si desmarcas uno, las órdenes de ese tipo se saltan el paso "Verificado por" del
        Seguimiento -- van directo de "Listo para entrega" a Notificaciones/Cierre de la orden.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="perm-table" style={{ minWidth: 380 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Tipo de equipo</th>
              <th>Requiere "Verificado por"</th>
            </tr>
          </thead>
          <tbody>
            {TIPOS_EQUIPO_PROCESOS.map((tipo) => (
              <tr key={tipo}>
                <td style={{ textAlign: "left" }}>{tipoEquipoDisplay(tipo)}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={requiereVerificacion(ajustes, tipo)}
                    disabled={loadingTipo === tipo}
                    onChange={(e) => toggle(tipo, e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
