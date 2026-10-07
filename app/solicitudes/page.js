import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePermiso } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { estadoSolicitud } from "@/lib/solicitudes";
import SolicitudCard from "./solicitud-card";

// "Solicitudes al almacén" (App Interno, V29). Pedido explícito: un
// usuario de la tienda le pide códigos al almacén ("la pide al almacen
// para que haya inventario en tienda"), y se marca como recibida cuando
// llega -- código por código ("por si algo no llega"). Vive en Más
// ("dejalo en mas"), con atajo opcional en el menú de arriba desde Mi
// Perfil › Personalizar mi menú. Solo entra quien tiene el permiso
// "Solicitar códigos a almacén" (o el Titular). Ver migration_52.sql.
export default async function SolicitudesPage({ searchParams }) {
  const supabase = createClient();
  const { user, profile } = await requirePermiso(supabase, "solicitudes_almacen");
  const tab = searchParams?.tab === "recibidas" ? "recibidas" : "pendientes";
  const creada = searchParams?.creada || "";

  const { data } = await supabase
    .from("solicitudes_almacen")
    .select("*, items:solicitudes_almacen_items(*)")
    .order("created_at", { ascending: false })
    .limit(300);

  const todas = data || [];
  // "Pendientes" = falta al menos un código por llegar (incluye las que
  // llegaron en parte); "Recibidas" = llegó todo.
  const pendientes = todas.filter((s) => estadoSolicitud(s.items) !== "recibida");
  const recibidas = todas.filter((s) => estadoSolicitud(s.items) === "recibida");
  const lista = tab === "recibidas" ? recibidas : pendientes;

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/mas" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb items={[{ label: "Más", href: "/mas" }, { label: "Solicitudes al almacén" }]} />
        <h1 className="page-title">Solicitudes al almacén</h1>

        <Link href="/solicitudes/nueva">
          <button className="btn btn-primary" type="button" style={{ marginTop: 4, marginBottom: 16, width: "auto" }}>
            + Solicitar códigos a almacén
          </button>
        </Link>

        {creada && (
          <div className="success-box" style={{ marginTop: 0, marginBottom: 14 }}>
            Solicitud #{creada} enviada.
          </div>
        )}

        <div className="period-toggle">
          <Link href="/solicitudes" className={"period-btn" + (tab === "pendientes" ? " period-btn-active" : "")}>
            Pendientes ({pendientes.length})
          </Link>
          <Link href="/solicitudes?tab=recibidas" className={"period-btn" + (tab === "recibidas" ? " period-btn-active" : "")}>
            Recibidas ({recibidas.length})
          </Link>
        </div>

        {lista.length === 0 ? (
          <div className="card">
            <div className="empty">
              {tab === "recibidas" ? "Todavía no hay solicitudes recibidas." : "No hay solicitudes pendientes."}
            </div>
          </div>
        ) : (
          lista.map((s) => (
            <SolicitudCard key={s.id} solicitud={s} userId={user.id} nombreUsuario={profile?.full_name || user.email} />
          ))
        )}
      </div>
    </div>
  );
}
