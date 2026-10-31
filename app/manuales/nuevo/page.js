import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import ManualForm from "@/components/ManualForm";
import { puedeEditarManuales } from "@/lib/manuales-form-page";

export default async function NuevoManualPage({ searchParams }) {
  const supabase = createClient();
  const { volverA, clientes } = await puedeEditarManuales(supabase, searchParams?.desde);
  return (
    <div>
      {clientes ? <AppHeaderClientes /> : <AppHeader />}
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href={volverA} className="back-link">
          ← Manuales
        </Link>
        <h1 className="page-title">Agregar manual</h1>
        <ManualForm volverA={volverA} />
      </div>
    </div>
  );
}
