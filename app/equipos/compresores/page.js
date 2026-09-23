import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfileYUser, tieneAcceso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { IconCompressor } from "@/components/icons";

// Listado de compresores: tarjetas horizontales con foto, 3 por fila
// (spec del usuario, 23-sep-2026). Se muestran todos (activos e
// inactivos, estos últimos atenuados) -- el Titular reactiva/inactiva
// desde la ficha de cada uno.
export default async function CompresoresPage() {
  const supabase = createClient();
  const { profile } = await getProfileYUser(supabase);
  const puedeRegistrar = tieneAcceso(profile, "compresores");

  const { data: compresores } = await supabase
    .from("compresores")
    .select("id, codigo, descripcion, foto_url, activo")
    .order("codigo");

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Equipos", href: "/equipos" }, { label: "Compresores" }]} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {puedeRegistrar && (
            <Link href="/equipos/compresores/nuevo">
              <button className="btn btn-primary" type="button" style={{ marginTop: 0 }}>
                + Registrar compresor
              </button>
            </Link>
          )}
          <Link href="/equipos/compresores/historial">
            <button className="btn secondary" type="button" style={{ marginTop: 0 }}>
              Historial de mantenimientos
            </button>
          </Link>
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
