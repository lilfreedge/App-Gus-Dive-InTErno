import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireInterno } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { estadoSolicitud } from "@/lib/solicitudes";
import SolicitudCard from "./solicitud-card";
import CorreosAlmacen from "@/app/admin/usuarios/correos-almacen-client";
import { IconLock, IconMail } from "@/components/icons";

// "Solicitudes al almacén" (App Interno, V29). Pedido explícito: un
// usuario de la tienda le pide códigos al almacén ("la pide al almacen
// para que haya inventario en tienda"), y se marca como recibida cuando
// llega -- código por código ("por si algo no llega"). Vive en Más
// ("dejalo en mas"), con atajo opcional en el menú de arriba desde Mi
// Perfil › Personalizar mi menú. Solo entra quien tiene el permiso
// "Solicitar códigos a almacén" (o el Titular). Ver migration_52.sql.
export default async function SolicitudesPage({ searchParams }) {
  const supabase = createClient();
  const { user, profile } = await requireInterno(supabase, "solicitudes_almacen");
  const tab = searchParams?.tab === "recibidas" ? "recibidas" : "pendientes";
  const creada = searchParams?.creada || "";

  const esTitular = !!profile?.es_titular;
  // V34 (pedido explícito: "ponme que las solicitudes también las pueda
  // manipular en Solicitudes al almacén directo, así como está en reportes
  // ... esto solo lo puede ver el titular"): abajo, los correos que reciben
  // el aviso. Misma configuración que Administración › Correos automáticos.
  const { data: config } = esTitular
    ? await supabase.from("app_config").select("solicitudes_correos").maybeSingle()
    : { data: null };

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

        {esTitular && (
          <div className="card" style={{ marginTop: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <IconLock size={13} style={{ color: "var(--rojo)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--rojo)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                Solo visible para ti (Titular)
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
              <IconMail size={15} style={{ color: "var(--azul)" }} />
              <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--azul-texto)" }}>Aviso por correo al almacén</div>
            </div>
            <CorreosAlmacen
              correosIniciales={config?.solicitudes_correos || []}
              nota="A estos correos les llega el aviso cada vez que alguien hace una solicitud. Es la misma configuración que en Administración › Correos automáticos: lo que cambies aquí cambia allá."
            />
          </div>
        )}
      </div>
    </div>
  );
}
