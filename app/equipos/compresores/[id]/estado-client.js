"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Inactivar/Reactivar un compresor -- solo Titular, mismo patrón que
// tanques/reguladores (ahí vive en la lista, acá vive en la ficha porque
// las tarjetas de la grilla son muy chicas para un botón extra).
export default function EstadoCompresor({ compresor }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await supabase.from("compresores").update({ activo: !compresor.activo }).eq("id", compresor.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="btn secondary" type="button" onClick={toggle} disabled={loading}>
      {loading ? "..." : compresor.activo ? "Inactivar compresor" : "Reactivar compresor"}
    </button>
  );
}
