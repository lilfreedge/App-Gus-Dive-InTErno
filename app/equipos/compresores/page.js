import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { IconCompressor } from "@/components/icons";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { hoyISO, sumarDias } from "@/lib/fechas";

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
  const { profile } = await getProfileYUser(supabase);
  const puedeRegistrar = tieneAcceso(profile, "compresores");

  const { data: compresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion, foto_url, activo, proxima_inspeccion")
    .order("codigo");

  const hoy = hoyISO();
  const limite = sumarDias(hoy, 14);
  const activos = (compresores || []).filter((c) => c.activo);
  const compresoresPorInspeccionar = activos
    .filter((c) => !c.proxima_inspeccion || c.proxima_inspeccion <= limite)
    .sort((a, b) => (a.proxima_inspeccion || "0") < (b.proxima_inspeccion || "0") ? -1 : 1);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Compresores" }]} />

        {compresoresPorInspeccionar.length > 0 && (
          <div className="card">
            <div className="section-title" style={{ marginTop: 0 }}>Inspecciones</div>
            {compresoresPorInspeccionar.map((c) => {
              const vencida = !c.proxima_inspeccion || c.proxima_inspeccion < hoy;
              return (
                <div className="list-item" key={c.id}>
                  <div className="list-item-top">
                    <span className="list-item-title" style={vencida ? { color: "var(--rojo)" } : undefined}>
                      Hacer inspección de {c.codigo}
                    </span>
                    <span className="list-item-qty" style={vencida ? { color: "var(--rojo)" } : undefined}>
                      {c.proxima_inspeccion ? formatFechaDDMMAAAADeDate(c.proxima_inspeccion) : "Nunca inspeccionado"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center" }}>
          {puedeRegistrar && (
            <Link href="/equipos/compresores/mantenimiento/nueva">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar mantenimiento
              </button>
            </Link>
          )}
          <Link href="/equipos/compresores/historial">
            <button className="btn secondary" type="button" style={{ marginTop: 0 }}>
              Historial de mantenimientos
            </button>
          </Link>
          {puedeRegistrar && (
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

        {compresores && compresores.length > 0 ? (
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
