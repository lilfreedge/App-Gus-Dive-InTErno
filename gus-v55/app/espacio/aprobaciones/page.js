import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import HeaderSimple from "@/components/HeaderSimple";
import Breadcrumb from "@/components/Breadcrumb";
import AprobacionesClient from "./aprobaciones-client";

// "Usuarios nuevos" / aprobación del Titular (item 10, 1-oct-2026, pedido
// explícito: "quiero que los usuarios nuevos sean confirmados solo por
// mi, no que se confirmen ellos mismos por correo. Pienso que esto puede
// estar al principio en donde estan los apps") -- mismo lugar y mismo
// patrón Titular-only que /espacio/accesos (ver ese page.js), al que se
// llega desde el mismo menú de ajustes (ver HeaderSimple.js). Lista los
// perfiles con aprobado=false; aprobar uno le permite entrar a cualquier
// pantalla (el gate real vive en middleware.js, ver profiles.aprobado,
// migration_48.sql).
export default async function AprobacionesPage() {
  const supabase = createClient();
  await requireTitular(supabase);

  const { data: pendientes } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("aprobado", false)
    .order("created_at", { ascending: true });

  return (
    <div>
      <HeaderSimple nombre="" etiqueta="Usuarios nuevos" esTitular pendientesAprobacion={(pendientes || []).length} />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/espacio" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Selecciona tu espacio", href: "/espacio" }, { label: "Usuarios nuevos" }]} />
        <h1 className="page-title">Usuarios nuevos</h1>
        <p className="page-subtitle">
          Cuentas creadas que todavía no pueden entrar a ninguna app -- apruébalas una vez que sepas quién es. Después
          de aprobar, dale acceso a la app que le toque desde{" "}
          <Link href="/espacio/accesos" style={{ color: "var(--azul-claro)", fontWeight: 600 }}>
            Accesos a apps
          </Link>
          .
        </p>

        <AprobacionesClient pendientes={pendientes || []} />
      </div>
    </div>
  );
}
