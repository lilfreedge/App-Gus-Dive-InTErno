import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireTitular } from "@/lib/roles";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import { IconReport, IconCatalog, IconHistory, IconBook, IconShuffle, IconCompressor, IconEye, IconTankFill, IconWrench, IconReceipt, IconMail, IconEdit, IconTank } from "@/components/icons";
import { formatFecha } from "@/lib/format";

const PERMISOS_DEFAULT = {
  reportes: false,
  catalogo: true,
  historial: false,
  changelog: false,
  manual: false,
  movimientos: false,
  facturacion: false,
  registrar_inspeccion: false,
  registrar_llenado: false,
  registrar_mantenimiento: false,
  catalogo_codigo: false,
  catalogo_regulador: false,
  catalogo_tanque: false,
  compresores: false,
  correos_semanales: false,
};

// Mismos íconos y etiquetas que la tabla de permisos (lista-client.js) --
// se muestran aquí como chips de "qué puede hacer" en la ficha del usuario.
const PERMISOS_LABELS = [
  { clave: "reportes", label: "Reportes", Icono: IconReport },
  { clave: "catalogo", label: "Catálogo", Icono: IconCatalog },
  { clave: "historial", label: "Historial", Icono: IconHistory },
  { clave: "changelog", label: "Changelog", Icono: IconHistory },
  { clave: "manual", label: "Manual", Icono: IconBook },
  { clave: "movimientos", label: "Movimientos", Icono: IconShuffle },
  { clave: "compresores", label: "Compresores", Icono: IconCompressor },
  { clave: "registrar_inspeccion", label: "Inspecciones", Icono: IconEye },
  { clave: "registrar_llenado", label: "Llenados", Icono: IconTankFill },
  { clave: "registrar_mantenimiento", label: "Mantenimiento", Icono: IconWrench },
  { clave: "facturacion", label: "Facturación de llenado", Icono: IconReceipt },
  { clave: "correos_semanales", label: "Correos semanales", Icono: IconMail },
  { clave: "catalogo_codigo", label: "Código", Icono: IconEdit },
  { clave: "catalogo_regulador", label: "Regulador", Icono: IconWrench },
  { clave: "catalogo_tanque", label: "Tanque", Icono: IconTank },
];

function iniciales(nombre) {
  return (nombre || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "?";
}

// Ficha de un usuario: sus permisos, su actividad (cuántos movimientos de
// cada tipo registró) y datos básicos de la cuenta. Solo el Titular puede
// entrar aquí -- se llega tocando un nombre en Administración > Usuarios
// y permisos (V12: antes esa fila no llevaba a ningún lado).
export default async function FichaUsuarioPage({ params }) {
  const supabase = createClient();
  await requireTitular(supabase);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, is_admin, es_titular, permisos, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!perfil) notFound();

  const permisos = { ...PERMISOS_DEFAULT, ...(perfil.permisos || {}) };

  // auth.users (correo, último acceso) no es accesible con el cliente
  // normal por RLS -- se pide con el cliente de servicio, ya protegido
  // arriba por requireTitular.
  let correo = null;
  let ultimoAcceso = null;
  try {
    const admin = createServiceClient();
    const { data } = await admin.auth.admin.getUserById(params.id);
    correo = data?.user?.email || null;
    ultimoAcceso = data?.user?.last_sign_in_at || null;
  } catch {
    // Sin SUPABASE_SERVICE_ROLE_KEY configurada (ej. entorno local) --
    // la ficha igual funciona, solo sin estos dos datos.
  }

  const [{ count: salidas }, { count: llenados }, { count: inspecciones }, { count: mantenimientos }] =
    await Promise.all([
      supabase.from("salidas").select("id", { count: "exact", head: true }).eq("user_id", params.id),
      supabase.from("llenados_tanques").select("id", { count: "exact", head: true }).eq("user_id", params.id),
      supabase
        .from("inspecciones_visuales")
        .select("id", { count: "exact", head: true })
        .eq("user_id", params.id)
        .then((r) => (r.error ? { count: 0 } : r)),
      supabase
        .from("mantenimientos_reguladores")
        .select("id", { count: "exact", head: true })
        .eq("user_id", params.id)
        .then((r) => (r.error ? { count: 0 } : r)),
    ]);

  const rolLabel = perfil.es_titular ? "Titular" : perfil.is_admin ? "Administrador" : "Usuario";
  const permisosActivos = perfil.es_titular
    ? []
    : PERMISOS_LABELS.filter((p) => permisos[p.clave]);

  return (
    <div>
      <AppHeader />
      <div className="page" style={{ paddingTop: 24 }}>
        <Link href="/admin/usuarios" className="back-link">
          ← Volver
        </Link>
        <Breadcrumb
          items={[{ label: "Administración", href: "/admin/usuarios" }, { label: perfil.full_name }]}
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

        <div className="section-title">Actividad</div>
        <div className="stat-row">
          <div className="stat-card">
            <div className="stat-value">{salidas || 0}</div>
            <div className="stat-label">Salidas registradas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{llenados || 0}</div>
            <div className="stat-label">Tanques llenados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{inspecciones || 0}</div>
            <div className="stat-label">Inspecciones</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{mantenimientos || 0}</div>
            <div className="stat-label">Mantenimientos</div>
          </div>
        </div>
        <Link
          href={`/reportes?usuario_id=${params.id}`}
          style={{ display: "block", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none", marginBottom: 6 }}
        >
          Ver todos sus movimientos →
        </Link>

        {!perfil.es_titular && (
          <>
            <div className="section-title">Permisos activos</div>
            <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {permisosActivos.length === 0 && (
                <span style={{ fontSize: 13, color: "var(--texto-suave)" }}>
                  No tiene ningún permiso activado todavía.
                </span>
              )}
              {permisosActivos.map((p) => (
                <span
                  key={p.clave}
                  className="badge"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    ...(p.clave === "correos_semanales"
                      ? { background: "var(--acento-fondo)", color: "var(--acento-texto)" }
                      : {}),
                  }}
                >
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
