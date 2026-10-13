import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import { formatFecha, formatFechaDDMMAAAADeDate, formatMesAnio } from "@/lib/format";
import { hoyISO, sumarMeses } from "@/lib/fechas";

// Pruebas hidrostáticas de los tanques de alquiler (V29, pedido explícito:
// "quiero agregar seguimiento de prueba hidrostaticas para los tanques que
// tengamos... cada 5 años"). Mismo formato que Inspección visual: la lista
// de pruebas registradas y, abajo, los tanques pendientes (vencida o sin
// ninguna prueba registrada) y los que vencen en 2 meses o menos ("si por
// favor" al aviso con 2 meses de anticipación).
// La próxima prueba de cada tanque (tanques_alquiler.proxima_hidrostatica)
// la calcula la base de datos: la prueba con la fecha más reciente + 5
// años (ver supabase/migration_53.sql).
export default async function PruebasHidrostaticasPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_hidrostatica");
  const puedeRegistrar = tieneAcceso(profile, "registrar_hidrostatica");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const [{ data: pruebas }, { data: tanques }] = await Promise.all([
    supabase.from("pruebas_hidrostaticas_con_nombre").select("*").limit(200),
    supabase
      .from("tanques_alquiler")
      .select("id, codigo, proxima_hidrostatica")
      .eq("activo", true)
      .order("proxima_hidrostatica", { ascending: true, nullsFirst: true }),
  ]);

  const hoy = hoyISO();
  const limite = sumarMeses(hoy, 2);
  const tanquesPendientes = (tanques || []).filter(
    (t) => !t.proxima_hidrostatica || t.proxima_hidrostatica < hoy
  );
  const tanquesProximos = (tanques || []).filter(
    (t) => t.proxima_hidrostatica && t.proxima_hidrostatica >= hoy && t.proxima_hidrostatica <= limite
  );

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Pruebas hidrostáticas" }]} />

        {puedeRegistrar && (
          <Link href="/equipos/pruebas-hidrostaticas/nueva">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              + Registrar prueba hidrostática
            </button>
          </Link>
        )}

        <div className="card">
          {pruebas && pruebas.length > 0 ? (
            pruebas.map((p) => {
              // full_name viene de la vista (no es columna de la tabla) --
              // se quita del snapshot que guarda "anular", para que
              // después se pueda restaurar desde Historial sin error.
              const { full_name, ...registro } = p;
              return (
                <div className="list-item" key={p.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">
                      <span className="folio-tag">#{p.folio}</span>
                      Prueba hidrostática
                      <span className={p.resultado === "Aprobado" ? "badge badge-verde" : "badge badge-rojo"}>
                        {p.resultado}
                      </span>
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="list-item-qty">{p.tanque_codigo_snapshot}</span>
                      {puedeEditar && (
                        <RegistroActions
                          tabla="pruebas_hidrostaticas"
                          registro={registro}
                          editHref={`/equipos/pruebas-hidrostaticas/${p.id}/editar`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="list-item-meta">
                    Fecha de la prueba: <b>{formatMesAnio(p.fecha_prueba)}</b>
                  </div>
                  <div className="list-item-meta">
                    Registrada por {full_name} · {formatFecha(p.created_at)}
                  </div>
                  {p.nota && <div className="list-item-note">{p.nota}</div>}
                </div>
              );
            })
          ) : (
            <div className="empty">Aún no hay pruebas hidrostáticas registradas.</div>
          )}
        </div>

        {tanquesPendientes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Tanques pendientes por prueba hidrostática
            </div>
            <div className="card">
              {tanquesPendientes.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{t.codigo}</span>
                    <span className="badge badge-rojo">
                      {t.proxima_hidrostatica
                        ? `Vencida desde ${formatFechaDDMMAAAADeDate(t.proxima_hidrostatica)}`
                        : "Sin prueba registrada"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tanquesProximos.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 24 }}>
              Prueba hidrostática próxima a vencer (2 meses o menos)
            </div>
            <div className="card">
              {tanquesProximos.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{t.codigo}</span>
                    <span className="list-item-qty">{formatFechaDDMMAAAADeDate(t.proxima_hidrostatica)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
