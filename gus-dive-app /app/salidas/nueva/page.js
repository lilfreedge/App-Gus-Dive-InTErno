import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NuevaSalidaForm from "./form-client";

export default async function NuevaSalidaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <Link href="/dashboard" className="back-link">
        ← Volver
      </Link>
      <h1 className="page-title">Registrar salida</h1>
      <p className="page-subtitle">
        Pieza, ring o artículo que se saca para uso interno de la tienda.
      </p>

      <NuevaSalidaForm userId={user.id} />
    </div>
  );
}
