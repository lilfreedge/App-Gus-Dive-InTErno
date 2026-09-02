import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import NuevaSalidaForm from "./form-client";

export default async function NuevaSalidaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: articulos }, { data: admins }] = await Promise.all([
    supabase.from("articulos").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("profiles").select("id, full_name").eq("is_admin", true).order("full_name"),
  ]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Registrar salida</h1>
        <p className="page-subtitle">
          Pieza, ring o artículo que se saca para uso interno de la tienda.
        </p>

        <NuevaSalidaForm
          userId={user.id}
          articulos={articulos || []}
          admins={admins || []}
        />
      </div>
    </div>
  );
}
