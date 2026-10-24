import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tieneAcceso, requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { IconCompressor } from "@/components/icons";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO } from "@/lib/fechas";
import { cargarRecordatorios, lineaRecordatorio } from "@/lib/recordatorios";
import BotonRecordatorioHecho from "@/components/BotonRecordatorioHecho";

// Listado de compresores: tarjetas horizontales con foto, 3 por fila
// (spec del usuario, 23-sep-2026). Se muestran todos (activos e
// inactivos, estos últimos atenuados) -- el Titular reactiva/inactiva
// desde la ficha de cada uno.
//
// Botones (ajuste del usuario, 23-sep-2026): "Registrar mantenimiento"
// pasa a ser el prominente (a la izquierda, junto a Historial) porque se
// va a usar seguido; "Registrar compresor" se vuelve un link sutil a la
// derecha porque casi no se va a usar.
//
// Aviso de inspección (23-sep-2026, versión "dashboard" pedida por el
// usuario tras ver la primera): una sola lista arriba del listado, cada
// línea dice "Hacer inspección de {código} — {fecha}" en rojo si ya
// venció -- sin separar "pendiente" de "próximo" en dos bloques. Solo
// aplica a Inspección, cada 2 semanas (confirmado por el usuario) --
// Preventivo/Correctivo no llevan rango todavía.
export default async function CompresoresPage() {
  const supabase = createClient();
  const { profile } = await requireInterno(supabase, "compresores");
  // V34: registrar mantenimientos tiene su propio permiso (antes bastaba
  // con "compresores", que ahora es solo ver).
  const puedeRegistrar = tieneAcceso(profile, "compresor_mantenimiento_registrar");
  const puedeRegistrarCompresor = tieneAcceso(profile, "registrar_compresor");

  // V35: si la consulta falla, se avisa (antes decía "Todavía no hay
  // compresores registrados" aunque sí los hubiera -- reportado 23-oct-2026:
  // le faltaba a la base la columna proxima_inspeccion, ver migration_68.sql).
  const { data: compresores, error: errorCompresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion, foto_url, activo, proxima_inspeccion")
    .order("codigo");

  const hoy = hoyISO();
  // V37: el aviso de "Inspecciones" ahora sale de los Recordatorios
  // (el de cada 14 días es el primero; migration_70.sql). A cada quien le
  // salen los suyos.
  const { items: recordatorios } = await cargarRecordatorios(supabase, { usuarioId: profile?.id, hoy });
  const esAdmin = !!profile?.es_titular || !!profile?.is_admin;
  const puedeVerHistorial = tieneAcceso(profile, "compresores_historial");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Compresores" }]} />

        {(recordatorios.length > 0 || esAdmin) && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Recordatorios</div>
            {recordatorios.length === 0 && <div className="empty">No tienes recordatorios.</div>}
            {recordatorios.map((it) => {
              const color =
                it.estado === "vencido" ? "var(--rojo)" : it.estado === "pronto" ? "#b5691f" : undefined;
              return (
                <div className="list-item" key={`${it.recordatorio.id}-${it.compresor?.id || "x"}`}>
                  <div className="list-item-top" style={{ gap: 10 }}>
                    <span className="list-item-title" style={color ? { color } : undefined}>
                      {lineaRecordatorio(it, formatFechaDDMMAAAADeDate)}
                    </span>
                    {it.recordatorio.reinicia === "hecho" && it.estado !== "ok" && (
                      <BotonRecordatorioHecho
                        recordatorioId={it.recordatorio.id}
                        compresorId={it.compresor?.id || null}
                        nombre={profile?.full_name || ""}
                      />
                    )}
                  </div>
                </div>
              );
            })}
            {esAdmin && (
              <Link
                href="/equipos/compresores/recordatorios"
                style={{ display: "inline-block", marginTop: 10, color: "var(--azul-claro)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
              >
                Administrar recordatorios ›
              </Link>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
          {puedeRegistrar && compresores && compresores.length > 0 && (
            <Link href="/equipos/compresores/mantenimiento/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar mantenimiento
              </button>
            </Link>
          )}
          {puedeVerHistorial && (
            <Link href="/equipos/compresores/historial">
              <button className="btn secondary" type="button" style={{ marginTop: 0 }}>
                Historial de mantenimientos
              </button>
            </Link>
          )}
          {puedeRegistrarCompresor && (
            <Link
              href="/equipos/compresores/nuevo"
              style={{
                marginLeft: "auto",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--azul-claro)",
                textDecoration: "none",
              }}
            >
              + Registrar compresor
            </Link>
          )}
        </div>

        {errorCompresores ? (
          <div className="error-box">
            No se pudieron cargar los compresores ({errorCompresores.message}). Avísale al Titular.
          </div>
        ) : compresores && compresores.length > 0 ? (
          <div className="compresor-grid">
            {compresores.map((c) => (
              <Link
                key={c.id}
                href={`/equipos/compresores/${c.id}`}
                className={`compresor-card${c.activo ? "" : " compresor-card-inactivo"}`}
              >
                {c.foto_url ? (
                  <img src={c.foto_url} alt={c.codigo} className="compresor-card-foto" />
                ) : (
                  <div className="compresor-card-foto-placeholder">
                    <IconCompressor size={30} />
                  </div>
                )}
                <div className="compresor-card-body">
                  <div className="compresor-card-codigo">{c.codigo}</div>
                  {c.descripcion && <div className="compresor-card-desc">{c.descripcion}</div>}
                  {!c.activo && <div className="badge badge-rojo" style={{ marginTop: 4 }}>Inactivo</div>}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty">Todavía no hay compresores registrados.</div>
          </div>
        )}
      </div>
    </div>
  );
}
