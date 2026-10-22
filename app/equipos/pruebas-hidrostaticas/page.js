import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import RegistroActions from "@/components/RegistroActions";
import ConInfo from "@/components/ConInfo";
import { formatFecha, formatFechaDDMMAAAADeDate, formatMesAnio } from "@/lib/format";
import { hoyISO, sumarMeses } from "@/lib/fechas";
import { enviosAbiertos, claseDiasAfuera, diasEntreFechas } from "@/lib/envios-hidrostatica";

// Pruebas hidrostáticas de NUESTROS tanques (V29; rehecha en V32).
//
// V32 (pedidos explícitos, todos con maqueta aprobada):
// - "saber cuándo se enviaron y qué tiempo tienen" -> "Enviar tanques a PH"
//   es el botón principal y arriba sale "Afuera en prueba hidrostática" con
//   los días afuera de cada tanque (azul hasta 15, ámbar 16-30, rojo +30).
//   Al volver, "Registrar regreso" anota la prueba de una vez (y la
//   inspección visual si sale aprobada; si sale rechazada el tanque se
//   inactiva solo -- migration_63.sql).
// - "¿de qué me sirve tener el botón 'registrar prueba hidrostática'?" ->
//   se quitó el botón grande; queda un enlace chico para anotar pruebas
//   viejas, de antes de usar el app.
// - "pon que los 'Tanques pendientes por prueba hidrostática' salga de
//   primero en la ventana. y que no aparezca en caso de no tener tanques
//   pendiente" -> primero, y solo si hay. Los que están afuera NO cuentan
//   como pendientes (ya se están atendiendo).
// - "esto no tiene que figurar en inicio, solo en esta sección".
// - Permisos (V32): "registrar_hidrostatica" es para VER esta pantalla;
//   "hidrostatica_registrar" (nuevo) para enviar, registrar regreso y
//   anotar pruebas.
export default async function PruebasHidrostaticasPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "registrar_hidrostatica");
  const puedeRegistrar = tieneAcceso(profile, "hidrostatica_registrar");
  const puedeEditar = !!(profile?.is_admin || profile?.es_titular);

  const [{ data: pruebas }, { data: tanques }, afuera, { data: enviosCerrados }] = await Promise.all([
    supabase.from("pruebas_hidrostaticas_con_nombre").select("*").limit(200),
    supabase
      .from("tanques_alquiler")
      .select("id, codigo, proxima_hidrostatica")
      .eq("activo", true)
      .order("proxima_hidrostatica", { ascending: true, nullsFirst: true }),
    enviosAbiertos(supabase),
    supabase
      .from("envios_hidrostatica")
      .select("prueba_id, fecha_envio, fecha_regreso")
      .not("prueba_id", "is", null)
      .then((r) => (r.error ? { data: [] } : r)),
  ]);

  const hoy = hoyISO();
  const limite = sumarMeses(hoy, 2);
  const idsAfuera = new Set(afuera.map((e) => e.tanque_id));
  const envioPorPrueba = new Map((enviosCerrados || []).map((e) => [e.prueba_id, e]));

  const tanquesPendientes = (tanques || []).filter(
    (t) => !idsAfuera.has(t.id) && (!t.proxima_hidrostatica || t.proxima_hidrostatica < hoy)
  );
  const tanquesProximos = (tanques || []).filter(
    (t) =>
      !idsAfuera.has(t.id) &&
      t.proxima_hidrostatica &&
      t.proxima_hidrostatica >= hoy &&
      t.proxima_hidrostatica <= limite
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
          <Link href="/equipos/pruebas-hidrostaticas/enviar">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
              Enviar tanques a PH
            </button>
          </Link>
        )}

        {tanquesPendientes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 0 }}>
              Tanques pendientes por prueba hidrostática
            </div>
            <div className="card">
              {tanquesPendientes.map((t) => (
                <div className="list-item" key={t.id}>
                  <div className="list-item-top">
                    <Link href={`/catalogo/tanques/${t.id}`} className="list-item-title" style={{ textDecoration: "none", color: "inherit" }}>
                      {t.codigo}
                    </Link>
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
            <div className="section-title" style={{ marginTop: tanquesPendientes.length > 0 ? 24 : 0 }}>
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

        <ConInfo
          style={{ marginTop: 24, marginBottom: 12 }}
          texto="Los días que lleva cada tanque afuera: en azul hasta 15 días, en ámbar de 16 a 30 y en rojo más de 30. Cuando el tanque vuelve, toca &quot;Registrar regreso&quot;: con eso queda registrada la prueba (y la inspección visual, si sale aprobada) y el tanque sale de esta lista. Si sale rechazada, el tanque se inactiva solo."
        >
          <div className="section-title" style={{ margin: 0 }}>
            Afuera en prueba hidrostática ({afuera.length})
          </div>
        </ConInfo>
        {/* V33 (pedido explícito: "que se puedan recibir varios tanques, no
            de uno en uno"): registrar el regreso de varios a la vez. El
            "Registrar regreso" de cada uno se queda, para cuando vuelve uno
            solo. */}
        {puedeRegistrar && afuera.length > 1 && (
          <Link href="/equipos/pruebas-hidrostaticas/regreso-varios">
            <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 12 }}>
              Registrar regreso de varios
            </button>
          </Link>
        )}
        <div className="card">
          {afuera.length === 0 ? (
            <div className="empty">No hay tanques afuera ahora mismo.</div>
          ) : (
            afuera.map((e) => {
              const dias = diasEntreFechas(e.fecha_envio, hoy);
              return (
                <div className="list-item" key={e.id}>
                  <div className="list-item-top">
                    <span className="list-item-title">{e.tanque_codigo_snapshot}</span>
                    <span className={`badge ${claseDiasAfuera(dias)}`}>
                      Afuera hace {dias} día{dias === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="list-item-meta">Enviado el {formatFechaDDMMAAAADeDate(e.fecha_envio)}</div>
                  {e.nota && <div className="list-item-note">{e.nota}</div>}
                  {(puedeRegistrar || puedeEditar) && (
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                      {puedeRegistrar && (
                        <Link href={`/equipos/pruebas-hidrostaticas/regreso/${e.id}`}>
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ marginTop: 0, width: "auto", padding: "6px 12px", fontSize: 12.5 }}
                          >
                            Registrar regreso
                          </button>
                        </Link>
                      )}
                      {puedeEditar && (
                        <span style={{ marginLeft: "auto" }}>
                          <RegistroActions tabla="envios_hidrostatica" registro={e} mostrarEditar={false} />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="section-title" style={{ marginTop: 24 }}>
          Pruebas registradas
        </div>
        <div className="card">
          {pruebas && pruebas.length > 0 ? (
            pruebas.map((p) => {
              // full_name viene de la vista (no es columna de la tabla) --
              // se quita del snapshot que guarda "anular", para que
              // después se pueda restaurar desde Historial sin error.
              const { full_name, ...registro } = p;
              const envio = envioPorPrueba.get(p.id);
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
                  {envio && (
                    <div className="list-item-meta">
                      Enviado el {formatFechaDDMMAAAADeDate(envio.fecha_envio)} · regresó el{" "}
                      {formatFechaDDMMAAAADeDate(envio.fecha_regreso)} ({diasEntreFechas(envio.fecha_envio, envio.fecha_regreso)}{" "}
                      días afuera)
                    </div>
                  )}
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

        {puedeRegistrar && (
          <div style={{ textAlign: "center", marginTop: 4 }}>
            <Link
              href="/equipos/pruebas-hidrostaticas/nueva"
              style={{ fontSize: 12.5, fontWeight: 600, color: "var(--azul-claro)" }}
            >
              Anotar una prueba ya hecha (sin envío)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
