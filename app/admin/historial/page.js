import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";

export default async function HistorialCambiosPage() {
  const supabase = createClient();
  await requireAdmin(supabase);

  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .limit(200);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/dashboard" className="back-link">
          ← Volver
        </Link>
        <h1 className="page-title">Historial de cambios</h1>
        <p className="page-subtitle">
          Ediciones y borrados hechos por administradores, con cómo estaba el registro
          antes del cambio.
        </p>

        <div className="card">
          {cambios && cambios.length > 0 ? (
            cambios.map((c) => (
              <div className="list-item" key={c.id}>
                <div className="list-item-top">
                  <span className="list-item-title">
                    {c.accion === "borrar" ? "Borró" : "Editó"}{" "}
                    {c.tabla === "salidas" ? "una salida" : "un llenado"}
                  </span>
                </div>
                <div className="list-item-meta">
                  {c.full_name} · {formatFecha(c.created_at)}
                </div>
                <div className="list-item-note">
                  Antes: {resumenDatos(c.tabla, c.datos_anteriores)}
                </div>
              </div>
            ))
          ) : (
            <div className="empty">Todavía no hay cambios registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function resumenDatos(tabla, datos) {
  if (tabla === "salidas") {
    return `${datos.articulo} x${datos.cantidad} · ${datos.motivo}`;
  }
  return `${datos.cantidad} tanque(s)${datos.nota ? ` · ${datos.nota}` : ""}`;
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
