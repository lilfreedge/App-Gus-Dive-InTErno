import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import ManualForm from "@/components/ManualForm";
import { puedeEditarManuales } from "@/lib/manuales-form-page";

export default async function EditarManualPage({ params, searchParams }) {
  const supabase = createClient();
  const { volverA, clientes } = await puedeEditarManuales(supabase, searchParams?.desde);
  const { data: manual } = await supabase.from("manuales").select("*").eq("id", params.id).maybeSingle();
  if (!manual) notFound();
  return (
    <div>
      {clientes ? <AppHeaderClientes /> : <AppHeader />}
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={volverA} className="back-link">
          ← Manuales
        </Link>
        <h1 className="page-title">Editar manual</h1>
        <ManualForm manual={manual} volverA={volverA} />
      </div>
    </div>
  );
}
