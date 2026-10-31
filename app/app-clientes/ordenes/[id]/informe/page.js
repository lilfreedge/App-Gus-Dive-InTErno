import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePermisoClientes, esTecnico } from "@/lib/roles";
import AppHeaderClientes from "@/components/AppHeaderClientes";
import Breadcrumb from "@/components/Breadcrumb";
import HeaderSimple from "@/components/HeaderSimple";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";
import InformeMantenimientoForm from "./form-client";

// "Informe de mantenimiento" (item 36, nueva feature, ronda grande de
// feedback, 27-sep-2026) -- mockup aprobado Informe.dc.html. Pantalla
// propia, separada de "Actualizar estado de orden" y de "Reportes": un
// formulario estructurado que llena el técnico (marca/modelo/serie,
// trabajo realizado, presión, observación, aprobado/no aprobado) y que
// se convierte en el informe/PDF que se entrega al cliente. Por ahora
// solo Reguladores, mismo alcance que ya tenía Reportes.
export default async function InformeMantenimientoPage({ params, searchParams }) {
  const supabase = createClient();
  const { profile } = await requirePermisoClientes(
    supabase,
    "equipos_clientes_informe_mantenimiento",
    `/app-clientes/ordenes/${params.id}`
  );

  const { data: orden } = await supabase
    .from("ordenes_equipos_con_nombre")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orden) notFound();
  if (orden.tipo_equipo !== "Reguladores") notFound();

  let serie = null;
  if (orden.equipo_id) {
    const { data: equipo } = await supabase
      .from("equipos_del_cliente")
      .select("serie")
      .eq("id", orden.equipo_id)
      .maybeSingle();
    serie = equipo?.serie || null;
  }

  // V50: lo que se había ido guardando solo (si el informe no existe todavía).
  // Sin migration_75.sql la tabla no existe y no trae nada.
  let borrador = null;
  if (!orden.informe_mantenimiento) {
    const { data: b } = await supabase.from("informes_borrador").select("*").eq("orden_id", params.id).maybeSingle();
    borrador = b || null;
  }

  // "Volver": a donde se abrió el informe -- el menú del técnico
  // (?from=tecnico), Actualizar estado (?from=actualizar) o la orden.
  const como = /^[0-9a-f-]{36}$/i.test(searchParams?.como || "") ? searchParams.como : null;
  const volverHref =
    searchParams?.from === "tecnico"
      ? `/tecnico?abrir=${params.id}${como ? `&como=${como}` : ""}`
      : searchParams?.from === "actualizar"
        ? `/app-clientes/ordenes/${params.id}/editar`
        : `/app-clientes/ordenes/${params.id}`;

  // V40 -- El técnico ve el informe sencillo (pedido explícito: "Quitar
  // opcion de imprimir/guardar y enviar por correo al rol de tecnico. no le
  // aplica" y "que cuando le de a generar informe lo mande para atras
  // automatico"): sin el encabezado del app ni la miga de pan, sin las
  // pestañas, sin Imprimir ni Enviar por correo; al guardar vuelve solo.
  if (esTecnico(profile)) {
    const equipo = [tipoEquipoLabel(orden.tipo_equipo, orden.tipo_equipo_otro), orden.equipo_marca_snapshot, orden.equipo_modelo_snapshot]
      .filter((x) => x && String(x).trim())
      .join(" ");
    return (
      <div>
        <HeaderSimple nombre="" sinBarra inicio="/tecnico" enlaces={[{ href: "/app-clientes/perfil", texto: "Mi perfil" }]} />
        <div className="page" style={{ paddingTop: 12 }}>
          <Link href={volverHref} className="back-link">
            ← Volver
          </Link>
          <h1 className="page-title" style={{ marginBottom: 2 }}>
            Informe de mantenimiento
          </h1>
          <div style={{ fontSize: 14, color: "var(--texto-suave)", marginBottom: 12 }}>
            No. {orden.no_orden_fisico ?? orden.folio}
            {equipo ? ` · ${equipo}` : ""}
          </div>
          <InformeMantenimientoForm
            orden={{ ...orden, cliente_telefono: null }}
            serie={serie}
            tecnicoSugerido={profile?.full_name || ""}
            sencillo
            borrador={borrador}
            alGuardar={searchParams?.from === "tecnico" ? `${volverHref}&informe=ok` : volverHref}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Arreglo de impresión (28-sep-2026, pedido explícito: "el informe
          sigue saliendo con formato extrano, no el deseado") -- el fix
          anterior (no-print en "← Volver"/miga de pan/título) no incluía
          el encabezado de navegación (AppHeaderClientes: logo, "Hola,
          Pipe", pestañas Inicio/Registro de Órdenes/etc.), así que seguía
          imprimiéndose completo arriba del informe. Mismo problema existía
          en Reportes (reportes/[id]/page.js), se corrigió ahí también. */}
      <div className="no-print">
        <AppHeaderClientes />
      </div>
      <div className="page" style={{ paddingTop: 24 }}>
        {/* Arreglo de impresión (feedback sobre v40, pedido explícito:
            "el pdf del informe sale mal, en 2 paginas") -- a esta pantalla
            le faltaban las clases "no-print" que ya usa el patrón que
            funciona bien (ver reportes/[id]/page.js): sin ellas, "←
            Volver", la miga de pan y el título también se imprimían junto
            con el informe, empujando el contenido real a una 2da página. */}
        {/* V38: "Volver" regresa a donde se abrió el informe: el menú del
            técnico (?from=tecnico) o Actualizar estado (?from=actualizar). */}
        <Link href={volverHref} className="back-link no-print">
          ← Volver
        </Link>
        <div className="no-print">
          <Breadcrumb
            items={[
              { label: "App Equipos de clientes", href: "/app-clientes" },
              { label: "Registro de Órdenes", href: "/app-clientes/ordenes" },
              { label: `No. ${orden.no_orden_fisico ?? orden.folio}`, href: `/app-clientes/ordenes/${params.id}` },
              { label: "Informe de mantenimiento" },
            ]}
          />
        </div>
        <h1 className="page-title no-print">Informe de mantenimiento</h1>

        {/* V38: el técnico no ve el contacto del cliente ("cliente no debe
            de ver contacto"), ni siquiera en el formulario del Informe. */}
        <InformeMantenimientoForm
          orden={orden}
          serie={serie}
          tecnicoSugerido={profile?.full_name || ""}
          borrador={borrador}
          volver={
            searchParams?.from === "tecnico"
              ? { href: volverHref, texto: "← Volver a mis trabajos" }
              : searchParams?.from === "actualizar"
                ? { href: volverHref, texto: "← Volver a Actualizar estado" }
                : null
          }
        />
      </div>
    </div>
  );
}
