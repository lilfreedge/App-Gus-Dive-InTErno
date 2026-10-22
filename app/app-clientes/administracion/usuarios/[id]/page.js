import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import BotonEliminarCuenta from "@/components/BotonEliminarCuenta";
import { formatFecha } from "@/lib/format";
import { SECCIONES_CLIENTES } from "@/lib/permisos-clientes";

// V32 -- Ficha de un usuario en App Equipos de clientes (pedido explícito:
// "ponme que yo pueda darle click a cada usuario y ver sus stats y poder
// borrarlo, así como está en app interno"; "hazlo igual que en app
// interno"). Se llega tocando el nombre en Administración › Permisos.
// Solo el Titular. Igual que la de App Interno (app/admin/usuarios/[id]):
// su actividad en esta app, sus permisos activos y su cuenta, con
// "Eliminar cuenta" al final (es una sola cuenta para las dos apps).
function iniciales(nombre) {
  return (
    (nombre || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

async function contar(supabase, tabla, userId) {
  const r = await supabase.from(tabla).select("id", { count: "exact", head: true }).eq("user_id", userId);
  return r.error ? 0 : r.count || 0;
}

export default async function FichaUsuarioClientesPage({ params }) {
  const supabase = createClient();
  await requireTitular(supabase);

  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!perfil) notFound();

  // Correo y último acceso: solo con el cliente de servicio (ya protegido
  // arriba por requireTitular). Sin la llave, la ficha abre igual.
  let correo = null;
  let ultimoAcceso = null;
  try {
    const admin = createServiceClient();
    const { data } = await admin.auth.admin.getUserById(params.id);
    correo = data?.user?.email || null;
    ultimoAcceso = data?.user?.last_sign_in_at || null;
  } catch {
    // Sin SUPABASE_SERVICE_ROLE_KEY -- sigue sin estos dos datos.
  }

  const [ordenes, clientes, equipos, avisos] = await Promise.all([
    contar(supabase, "ordenes_equipos", params.id),
    contar(supabase, "clientes_equipos", params.id),
    contar(supabase, "equipos_del_cliente", params.id),
    contar(supabase, "avisos_clientes", params.id),
  ]);

  let nombreRol = null;
  if (perfil.rol_clientes_id) {
    const { data: rol } = await supabase.from("roles_app").select("nombre").eq("id", perfil.rol_clientes_id).maybeSingle();
    nombreRol = rol?.nombre || null;
  }
  const rolLabel = perfil.eliminado_en
    ? "Cuenta eliminada"
    : perfil.es_titular
    ? "Titular"
    : perfil.is_admin
    ? "Administrador"
    : nombreRol || "Usuario";

  const permisos = perfil.permisos || {};
  const conAcceso = perfil.es_titular || !!permisos.equipos_clientes;
  const permisosActivos = perfil.es_titular
    ? []
    : SECCIONES_CLIENTES.flatMap((s) => s.items).filter(
        (it) => !!permisos[it.clave] && (!it.soloAdmin || perfil.is_admin)
      );

  const stat = (valor, label) => (
    <div className="stat-card">
      <div className="stat-value">{valor}</div>
      <div className="stat-label">{label}</div>
    </div>
  );

  return (
    <div>
      <AppHeaderClientes />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/app-clientes/administracion" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[
            { label: "App Equipos de clientes", href: "/app-clientes" },
            { label: "Administración", href: "/app-clientes/administracion" },
            { label: perfil.full_name || "Usuario" },
          ]}
        />

        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "var(--azul)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {iniciales(perfil.full_name)}
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16.5 }}>{perfil.full_name}</div>
            {correo && <div style={{ fontSize: 12.5, color: "var(--texto-suave)", marginTop: 1 }}>{correo}</div>}
            <span
              className={"role-tag" + (perfil.es_titular ? " role-tag-titular" : "")}
              style={!perfil.es_titular ? { background: "var(--superficie-suave)", color: "var(--azul-texto)" } : undefined}
            >
              {rolLabel}
            </span>
          </div>
        </div>

        {!conAcceso && !perfil.eliminado_en && (
          <div className="aviso-box" style={{ marginTop: 0 }}>
            Todavía no tiene acceso a esta app: se le da en <b>Accesos a apps</b> (selector de apps).
          </div>
        )}

        <div className="section-title">Actividad</div>
        <div className="stat-row">
          {stat(ordenes, "Órdenes registradas")}
          {stat(clientes, "Clientes registrados")}
          {stat(equipos, "Equipos registrados")}
          {stat(avisos, "Avisos por WhatsApp")}
        </div>
        <Link
          href={`/app-clientes/administracion/bitacora-movimientos?usuario=${params.id}`}
          style={{
            display: "block",
            textAlign: "center",
            fontSize: 12.5,
            fontWeight: 700,
            color: "var(--azul-claro)",
            textDecoration: "none",
            marginBottom: 6,
          }}
        >
          Ver sus movimientos en órdenes →
        </Link>

        {!perfil.es_titular && (
          <>
            <div className="section-title">Permisos activos</div>
            <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {nombreRol && (
                <div className="hint-text" style={{ width: "100%", marginTop: 0, marginBottom: 4 }}>
                  Los manda el rol <b>{nombreRol}</b>.
                </div>
              )}
              {permisosActivos.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--texto-suave)" }}>No tiene ningún permiso activado todavía.</span>
              )}
              {permisosActivos.map((p) => (
                <span key={p.clave} className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <p.Icono size={12} />
                  {p.label}
                </span>
              ))}
            </div>
          </>
        )}

        <div className="section-title">Cuenta</div>
        <table className="table-mini">
          <tbody>
            <tr>
              <td>Último acceso</td>
              <td>{ultimoAcceso ? formatFecha(ultimoAcceso) : "No disponible"}</td>
            </tr>
            <tr>
              <td>Usuario desde</td>
              <td>{perfil.created_at ? formatFecha(perfil.created_at) : "—"}</td>
            </tr>
            {perfil.eliminado_en && (
              <tr>
                <td>Cuenta eliminada</td>
                <td>{formatFecha(perfil.eliminado_en)}</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Una sola cuenta para las dos apps: eliminarla aquí la elimina
            también en App Interno. */}
        {!perfil.es_titular && !perfil.eliminado_en && (
          <div style={{ marginTop: 18 }}>
            <BotonEliminarCuenta id={perfil.id} nombre={perfil.full_name} volverA="/app-clientes/administracion" />
            <div className="hint-text" style={{ marginTop: 6 }}>
              Es la misma cuenta de App Interno: se elimina en las dos apps.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
