import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO } from "@/lib/fechas";
import { diasEntreFechas } from "@/lib/envios-hidrostatica";
import RegresoForm from "./form-client";

// V32 -- "Registrar regreso" de un tanque que estaba afuera en prueba
// hidrostática: con esto queda registrada la prueba (y la inspección visual
// si sale aprobada; si sale rechazada el tanque se inactiva solo). Todo lo
// hace registrar_prueba_hidrostatica() en la base de datos (migration_63).
export default async function RegresoPage({ params }) {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_hidrostatica");
  if (!tieneAcceso(profile, "hidrostatica_registrar")) redirect("/equipos/pruebas-hidrostaticas");

  const { data: envio } = await supabase
    .from("envios_hidrostatica")
    .select("id, tanque_id, tanque_codigo_snapshot, fecha_envio, fecha_regreso, nota")
    .eq("id", params.id)
    .maybeSingle();
  if (!envio) notFound();
  if (envio.fecha_regreso) redirect("/equipos/pruebas-hidrostaticas");

  const dias = diasEntreFechas(envio.fecha_envio, hoyISO());

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
            { label: "Registrar regreso" },
          ]}
        />
        <div className="card" style={{ padding: "12px 16px", marginBottom: 12 }}>
          <div className="list-item-title">{envio.tanque_codigo_snapshot}</div>
          <div className="hint-text">
            Enviado el {formatFechaDDMMAAAADeDate(envio.fecha_envio)} · afuera {dias} día{dias === 1 ? "" : "s"}
          </div>
          {envio.nota && <div className="list-item-note">{envio.nota}</div>}
        </div>
        <RegresoForm envio={envio} />
      </div>
    </div>
  );
}
