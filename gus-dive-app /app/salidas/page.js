import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function SalidasPage() {
  const supabase = createClient();
  const { data: salidas } = await supabase
    .from("salidas_con_nombre")
    .select("*")
    .limit(200);

  return (
    <div className="page" style={{ paddingTop: 24 }}>
      <Link href="/dashboard" className="back-link">
        ← Volver
      </Link>
      <h1 className="page-title">Historial de salidas</h1>
      <p className="page-subtitle">Piezas y artículos sacados para uso interno.</p>

      <Link href="/salidas/nueva">
        <button className="btn btn-primary" type="button" style={{ marginTop: 0, marginBottom: 20 }}>
          + Registrar salida
        </button>
      </Link>

      <div className="card">
        {salidas && salidas.length > 0 ? (
          salidas.map((s) => (
            <div className="list-item" key={s.id}>
              <div className="list-item-top">
                <span className="list-item-title">{s.articulo}</span>
                <span className="list-item-qty">x{s.cantidad}</span>
              </div>
              <div className="list-item-meta">
                {s.full_name} · {formatFecha(s.created_at)}
              </div>
              <div className="list-item-note">
                Motivo: {s.motivo}
                {s.autorizado_por ? ` · Autorizó: ${s.autorizado_por}` : ""}
              </div>
              {s.nota && <div className="list-item-note">Nota: {s.nota}</div>}
            </div>
          ))
        ) : (
          <div className="empty">Aún no hay salidas registradas.</div>
        )}
      </div>
    </div>
  );
}

function formatFecha(iso) {
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
