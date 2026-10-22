// V32 -- Las secciones de permisos de App Equipos de clientes, en un
// archivo aparte (antes vivían dentro de permisos-client.js, que es "use
// client"): así las puede usar también la ficha del usuario
// (app/app-clientes/administracion/usuarios/[id]/page.js), que se arma en
// el servidor. Mismo contenido de siempre.
import {
  IconEdit,
  IconTank,
  IconPlus,
  IconCatalog,
  IconClipboard,
  IconHistory,
  IconReport,
  IconRefresh,
  IconUsers,
  IconCompressor,
  IconWrench,
} from "@/components/icons";

// V30 → v56 -- Permisos agrupados por sección de la app (igual que App
// Interno), en lugar de por tipo de acción (General / Registrar / Más /
// Administradores). Los ítems con `soloAdmin: true` siguen apareciendo
// dentro de cada sección pero atenuados/bloqueados para usuarios no-admin.
// Las claves de permiso NO cambiaron, solo la agrupación visual.
export const SECCIONES_CLIENTES = [
  {
    titulo: "Órdenes",
    items: [
      { clave: "equipos_clientes_listado_ordenes", label: "Historial de órdenes", Icono: IconHistory },
      { clave: "equipos_clientes_registrar", label: "Registrar orden", Icono: IconEdit },
      { clave: "equipos_clientes_actualizar_estado", label: "Actualizar estado de orden", Icono: IconRefresh },
      { clave: "equipos_clientes_editar_orden", label: "Editar orden", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_editar_hold", label: "Editar Hold", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_bitacora_orden", label: "Ver bitácora de la orden", Icono: IconClipboard, soloAdmin: true },
    ],
  },
  {
    titulo: "Clientes",
    items: [
      { clave: "equipos_clientes_listado_clientes", label: "Listado de clientes", Icono: IconUsers },
      { clave: "equipos_clientes_agregar_cliente", label: "Registrar cliente", Icono: IconPlus },
      { clave: "equipos_clientes_editar_cliente", label: "Editar cliente", Icono: IconEdit, soloAdmin: true },
    ],
  },
  {
    titulo: "Equipos",
    items: [
      { clave: "equipos_clientes_agregar_equipo", label: "Registrar equipo de cliente", Icono: IconTank },
      { clave: "equipos_clientes_informe_mantenimiento", label: "Informe de mantenimiento", Icono: IconWrench },
      { clave: "equipos_clientes_editar_equipo", label: "Editar equipo", Icono: IconEdit, soloAdmin: true },
      {
        clave: "equipos_clientes_editar_mantenimiento_compresor",
        label: "Editar mantenimiento de compresor",
        Icono: IconCompressor,
        soloAdmin: true,
      },
    ],
  },
  {
    titulo: "Base de datos",
    items: [
      { clave: "equipos_clientes_catalogo", label: "Base de datos", Icono: IconCatalog },
      { clave: "equipos_clientes_agregar_codigo", label: "Registrar código en base de datos", Icono: IconCatalog },
      { clave: "equipos_clientes_registrar_servicio", label: "Registrar servicio en base de datos", Icono: IconWrench },
      { clave: "equipos_clientes_editar_codigo", label: "Editar código", Icono: IconEdit, soloAdmin: true },
      { clave: "equipos_clientes_editar_servicio", label: "Editar servicio", Icono: IconWrench, soloAdmin: true },
    ],
  },
  {
    titulo: "Más",
    items: [
      { clave: "equipos_clientes_reportes", label: "Recibos e Informes", Icono: IconReport },
      { clave: "equipos_clientes_contactar", label: "Clientes por contactar", Icono: IconUsers },
      { clave: "equipos_clientes_historial", label: "Anulaciones y ediciones", Icono: IconHistory, soloAdmin: true },
      { clave: "equipos_clientes_bitacora_movimientos", label: "Bitácora de órdenes", Icono: IconClipboard, soloAdmin: true },
    ],
  },
];

