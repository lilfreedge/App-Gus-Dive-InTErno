import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  credencialesManagementApi,
  getEspacioBaseDeDatos,
  getAlmacenamientoArchivos,
  getUsuariosActivos,
  getSolicitudesBaseDeDatos,
  formatearBytes,
  formatearNumero,
} from "@/lib/supabaseUsage";

export const dynamic = "force-dynamic";

// "Estado del sistema": solo el Titular puede verla. Muestra 4 métricas
// de uso de la cuenta de Supabase (para que el dueño sepa si se está
// acercando a los límites del plan gratis), con una explicación simple
// de qué significa cada una. Si todavía no se configuró el token de
// Supabase, se muestra un aviso en vez de números inventados.
export default async function EstadoSistemaPage() {
  const supabase = createClient();
  await requireTitular(supabase);

  const creds = credencialesManagementApi();

  let metricas = null;
  if (creds) {
    const [db, storage, usuarios, solicitudes] = await Promise.all([
      getEspacioBaseDeDatos(creds),
      getAlmacenamientoArchivos(creds),
      getUsuariosActivos(creds),
      getSolicitudesBaseDeDatos(creds),
    ]);
    metricas = { db, storage, usuarios, solicitudes };
  }

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/admin/usuarios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Administración", href: "/admin/usuarios" }, { label: "Estado del sistema" }]} />

        {!creds && (
          <div className="metric-notice">
            Esta información se activará cuando conectes tu token de
            Supabase (te lo explico cuando lleguemos a este paso). Por
            ahora no se muestra ningún número para no confundirte con
            datos que no son reales.
          </div>
        )}

        <MetricCard
          titulo="Espacio de base de datos usado"
          explicacion="Es cuánto de la base de datos (donde se guardan las salidas, los llenados de tanques, el catálogo, etc.) ya se ha usado del límite del plan gratis de Supabase."
          disponible={metricas?.db?.disponible}
          valor={
            metricas?.db?.disponible
              ? `${formatearBytes(metricas.db.bytes)} de ${formatearBytes(
                  metricas.db.limite
                )} (${Math.min(
                  100,
                  Math.round((metricas.db.bytes / metricas.db.limite) * 100)
                )}%)`
              : null
          }
          conectado={!!creds}
        />

        <MetricCard
          titulo="Usuarios activos este mes"
          explicacion="Es cuántas personas distintas han iniciado sesión y usado la app en los últimos 30 días."
          disponible={metricas?.usuarios?.disponible}
          valor={
            metricas?.usuarios?.disponible
              ? `${formatearNumero(metricas.usuarios.cantidad)} de ${formatearNumero(
                  metricas.usuarios.limite
                )} permitidos`
              : null
          }
          conectado={!!creds}
        />

        <MetricCard
          titulo="Almacenamiento de archivos usado"
          explicacion="Es el espacio usado por archivos subidos (como el logo de la empresa u otras imágenes), aparte de la base de datos. También tiene su propio límite en el plan gratis."
          disponible={metricas?.storage?.disponible}
          valor={
            metricas?.storage?.disponible
              ? `${formatearBytes(metricas.storage.bytes)} de ${formatearBytes(
                  metricas.storage.limite
                )} (${Math.min(
                  100,
                  Math.round(
                    (metricas.storage.bytes / metricas.storage.limite) * 100
                  )
                )}%)`
              : null
          }
          conectado={!!creds}
        />

        <MetricCard
          titulo="Solicitudes a la base de datos este mes"
          explicacion="Es cuántas veces la app le pidió información a la base de datos en los últimos 30 días. Cada vez que alguien abre una pantalla de la app, eso cuenta como una o varias solicitudes."
          disponible={metricas?.solicitudes?.disponible}
          valor={
            metricas?.solicitudes?.disponible
              ? formatearNumero(metricas.solicitudes.cantidad)
              : null
          }
          conectado={!!creds}
        />
      </div>
    </div>
  );
}

function MetricCard({ titulo, explicacion, disponible, valor, conectado }) {
  return (
    <div className="metric-card">
      <div className="metric-card-title">{titulo}</div>
      {conectado && disponible ? (
        <div className="metric-card-value">{valor}</div>
      ) : (
        <div className="metric-card-value metric-unavailable">
          {conectado ? "No disponible por ahora" : "Se activará más adelante"}
        </div>
      )}
      <div className="metric-card-explain">{explicacion}</div>
    </div>
  );
}
