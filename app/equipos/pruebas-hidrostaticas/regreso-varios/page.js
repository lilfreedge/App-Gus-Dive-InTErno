import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { enviosAbiertos } from "@/lib/envios-hidrostatica";
import RegresoVariosForm from "./form-client";

// V33 -- "Registrar regreso de varios" (pedido explícito: "aquí necesito que
// se puedan recibir varios tanques, no de uno en uno así como está"; maqueta
// V33 sección 4, "ok"). Se marcan los tanques que volvieron; la fecha de
// regreso y el mes/año de la prueba se ponen una sola vez y el resultado
// (y una nota opcional) es por tanque. Lo guarda todo junto
// registrar_regresos_hidrostatica() (migration_65.sql): si uno falla, no
// se guarda ninguno.
export default async function RegresoVariosPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_hidrostatica");
  if (!tieneAcceso(profile, "hidrostatica_registrar")) redirect("/equipos/pruebas-hidrostaticas");

  const afuera = await enviosAbiertos(supabase);
  if (afuera.length === 0) redirect("/equipos/pruebas-hidrostaticas");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/pruebas-hidrostaticas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Pruebas hidrostáticas", href: "/equipos/pruebas-hidrostaticas" },
            { label: "Registrar regreso de varios" },
          ]}
        />
        <RegresoVariosForm envios={afuera} />
      </div>
    </div>
  );
}
