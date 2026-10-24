import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { requireAdminRecordatorios } from "./datos";
import { textoCada, textoCompresores, textoReinicio } from "@/lib/recordatorios";

// V37 -- Lista de recordatorios de compresores (plan-v37.html 2C, "me gusta
// a"). El aviso de inspección cada 14 días viene creado (migration_70.sql)
// y se puede editar o borrar como cualquier otro.
export default async function RecordatoriosPage() {
  const supabase = createClient();
  await requireAdminRecordatorios(supabase);

  const [{ data: recordatorios, error }, { data: compresores }, { data: perfiles }] = await Promise.all([
    supabase.from("recordatorios_compresores").select("*").order("created_at"),
    supabase.from("compresores").select("id, codigo").order("codigo"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const nombre = (id) => (perfiles || []).find((p) => p.id === id)?.full_name?.split(" ")[0] || "—";

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/equipos/compresores" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "Equipos", href: "/equipos" },
            { label: "Compresores", href: "/equipos/compresores" },
            { label: "Recordatorios" },
          ]}
        />
        <h1 className="page-title">Recordatorios</h1>
        <p className="page-subtitle">Solo tú y los administradores los crean y los cambian.</p>

        {error ? (
          <div className="error-box">
            No se pudieron cargar los recordatorios ({error.message}). Falta correr migration_70.sql en Supabase.
          </div>
        ) : (
          <div className="card">
            {(recordatorios || []).length === 0 && <div className="empty">Todavía no hay recordatorios.</div>}
            {(recordatorios || []).map((r) => (
              <div className="list-item" key={r.id} style={{ display: "block", opacity: r.activo ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <b>
                    {r.titulo}
                    {!r.activo && (
                      <span className="badge" style={{ marginLeft: 8 }}>
                        Apagado
                      </span>
                    )}
                  </b>
                  <Link
                    href={`/equipos/compresores/recordatorios/${r.id}/editar`}
                    style={{ color: "var(--azul-claro)", fontWeight: 700, fontSize: 12.5, textDecoration: "none" }}
                  >
                    Editar
                  </Link>
                </div>
                <div className="list-item-meta">
                  {textoCada(r)} · {textoCompresores(r, compresores || [])}
                </div>
                <div className="list-item-meta">
                  Se reinicia {textoReinicio(r)} · avisa {r.avisar_antes} {r.unidad === "horas" ? "h" : "días"} antes
                </div>
                <div className="list-item-meta">
                  Le sale a: {(r.usuario_ids || []).map(nombre).join(", ") || "nadie"}
                </div>
              </div>
            ))}
            <Link href="/equipos/compresores/recordatorios/nuevo" style={{ textDecoration: "none" }}>
              <button className="btn btn-primary" type="button" style={{ marginTop: 12 }}>
                + Nuevo recordatorio
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
