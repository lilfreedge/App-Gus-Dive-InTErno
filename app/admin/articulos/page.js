import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import NuevoArticuloForm from "./form-client";
import ListaArticulos from "./lista-client";

export default async function ArticulosPage() {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: articulos } = await supabase
    .from("articulos")
    .select("*")
    .order("nombre");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Catálogo de artículos</h1>
        <p className="page-subtitle">
          Solo lo que agregues aquí va a aparecer como opción al registrar una salida.
          Desactiva un artículo para que deje de aparecer, sin perder el historial.
        </p>

        <NuevoArticuloForm />

        <div className="card">
          <ListaArticulos articulos={articulos || []} />
        </div>
      </div>
    </div>
  );
}
