// V34 -- Opciones de "Pantalla de inicio" de un rol, en cada app
// (Administración › Roles, components/RolesAdmin.js). La base de datos
// (migration_66.sql, permisos_de_rol) marca rol_operativo / rol_equipos /
// rol_tecnico en los permisos de quien tiene el rol, según esta opción.

export const INICIO_INTERNO = [
  { valor: "normal", label: "Normal" },
  {
    valor: "llenados",
    corto: "llenados",
    label: "Solo llenados (formulario de llenado y resumen de la semana)",
    ayuda: "Su Inicio es la pantalla de llenados. En el menú solo le salen las secciones extra que marques abajo.",
  },
  {
    // Nombre exacto pedido por el usuario: "ponle 'Equipos (para rol
    // técnico)' así exactamente".
    valor: "equipos",
    corto: "equipos",
    label: "Equipos (para rol técnico)",
    ayuda:
      "Entra directo a Equipos, con solo lo que marques abajo, y en el menú solo le sale \"Equipos\". Para que entre a App Interno igual hay que darle App Interno en Accesos a apps.",
  },
];

export const INICIO_CLIENTES = [
  { valor: "normal", label: "Normal" },
  {
    valor: "asignadas",
    corto: "mis órdenes",
    label: "Mis órdenes asignadas",
    ayuda:
      "Entra directo a las órdenes que le asignen. En el menú solo le salen \"Mis órdenes\" e \"Historial de órdenes\" (si se lo marcas abajo). Al asignar una orden, salen las personas con un rol así.",
  },
];
