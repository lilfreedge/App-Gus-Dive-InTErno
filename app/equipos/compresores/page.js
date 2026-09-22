import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

export default async function CompresoresPage() {
  const supabase = createClient();
  await requirePermiso(supabase, "compresores");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Compresores" }]} />

        <div className="card">
          Todavía estamos armando esta parte de la app — el control de compresores
          (horas de uso, mantenimiento, cambios de filtro, etc.) llega en una
          próxima actualización. Por ahora no hay nada que configurar aquí.
        </div>
      </div>
    </div>
  );
}
