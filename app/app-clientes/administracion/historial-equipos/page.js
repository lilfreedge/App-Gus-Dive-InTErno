import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireTitular } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HistorialDeleteButton from "@/components/HistorialDeleteButton";
import { formatFecha } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// Historial de ediciones de Equipos del cliente -- sección NUEVA y
// SEPARADA del historial de ediciones de órdenes (pedido explícito del
// usuario, 23-sep-2026: "creamo otra seccion en administracion donde
// pueda ver el historial de cambios en equipos, para cuando le editen
// algo"). Solo el Titular entra aquí, mismo criterio que el historial de
// órdenes -- la política RLS de cambios_historial también oculta
// tabla = 'equipos_del_cliente' a administradores comunes (ver
// migration_24.sql), así que esto tampoco aparece en el Historial de
// App Interno.
export default async function HistorialEquiposPage() {
  const supabase = createClient();
  await requireTitular(supabase);

  const { data: cambios } = await supabase
    .from("historial_con_nombre")
    .select("*")
    .eq("tabla", "equipos_del_cliente")
    .order("created_at", { ascending: false })
    .limit(300);

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
            { label: "Historial de ediciones de Equipos" },
          ]}
        />

        {!cambios || cambios.length === 0 ? (
          <div className="empty">Todavía no hay ediciones de equipos registradas.</div>
        ) : (
          cambios.map((c) => <TarjetaEdicion key={c.id} cambio={c} />)
        )}
      </div>
    </div>
  );
}

function TarjetaEdicion({ cambio }) {
  const d = cambio.datos_anteriores || {};
  const tipoLabel = tipoEquipoLabel(d.tipo_equipo, d.tipo_equipo_otro);
  return (
    <div className="card edicion">
      <div className="list-item-top">
        <div className="list-item-title">{tipoLabel || "Equipo"} editado</div>
        <HistorialDeleteButton cambioId={cambio.id} />
      </div>
      <table className="table-mini" style={{ marginTop: 8 }}>
        <tbody>
          <tr>
            <td>Antes de editar — Tipo de equipo</td>
            <td>{tipoLabel || "—"}</td>
          </tr>
          <tr>
            <td>Antes de editar — {d.tipo_equipo === "Tanques" ? "Fabricante" : "Marca"}</td>
            <td>{d.marca || "—"}</td>
          </tr>
          {d.tipo_equipo !== "Tanques" && (
            <tr>
              <td>Antes de editar — Modelo</td>
              <td>{d.modelo || "—"}</td>
            </tr>
          )}
          {["Reguladores", "Tanques", "Computadora"].includes(d.tipo_equipo) && (
            <tr>
              <td>Antes de editar — No. Serie</td>
              <td>{d.serie || "—"}</td>
            </tr>
          )}
          <tr>
            <td>Editado por</td>
            <td>{cambio.full_name}</td>
          </tr>
          <tr>
            <td>Fecha de edición</td>
            <td>{formatFecha(cambio.created_at)}</td>
          </tr>
        </tbody>
      </table>
      <Link
        href={`/app-clientes/equipos/${cambio.registro_id}`}
        style={{ display: "inline-block", marginTop: 8, fontSize: 12.5, fontWeight: 700, color: "var(--azul-claro)", textDecoration: "none" }}
      >
        Ver equipo actual →
      </Link>
    </div>
  );
}
