import Link from "next/link";
import AppHeader from "@/components/AppHeader";

export default async function CompresoresPage() {
  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Compresores</h1>

        <div className="card">
          Todavía estamos armando esta parte de la app — el control de compresores
          (horas de uso, mantenimiento, cambios de filtro, etc.) llega en una
          próxima actualización. Por ahora no hay nada que configurar aquí.
        </div>
      </div>
    </div>
  );
}
