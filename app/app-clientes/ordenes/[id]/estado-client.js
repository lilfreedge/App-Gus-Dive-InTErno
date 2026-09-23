"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Avanza la orden al siguiente estado del flujo (Pendiente por trabajar
// → En proceso → Pendiente por despachar → Entregado). No existía un
// pedido explícito de cómo se debía mover el estado -- se agregó porque
// sin esto ninguna orden podría salir nunca de "Pendiente por trabajar",
// y el hub (que muestra pendientes por trabajar / por despachar) se
// quedaría sin sentido. Mismo patrón simple que Inactivar/Reactivar de
// compresores/tanques/reguladores: un botón, un update, refresh.
const SIGUIENTE = {
  "Pendiente por trabajar": { estado: "En proceso", boton: "Marcar en proceso" },
  "En proceso": { estado: "Pendiente por despachar", boton: "Marcar pendiente por despachar" },
  "Pendiente por despachar": { estado: "Entregado", boton: "Marcar entregado" },
};

export default function EstadoOrden({ orden }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const siguiente = SIGUIENTE[orden.estado];
  if (!siguiente) return null;

  async function avanzar() {
    setLoading(true);
    await supabase
      .from("ordenes_equipos")
      .update({ estado: siguiente.estado, updated_at: new Date().toISOString() })
      .eq("id", orden.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn btn-primary" type="button" onClick={avanzar} disabled={loading} style={{ marginTop: 0 }}>
      {loading ? "..." : siguiente.boton}
    </button>
  );
}
