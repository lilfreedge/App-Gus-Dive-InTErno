import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import ReportesForm from "./form-client";

export default async function ReportesPage() {
  const supabase = createClient();
  await requireAdmin(supabase);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Reportes</h1>
        <p className="page-subtitle">
          Elige el rango de fechas y descarga el detalle en Excel o CSV.
        </p>

        <ReportesForm />
      </div>
    </div>
  );
}
