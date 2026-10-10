// Explicación breve de qué puede hacer cada rol. Solo texto informativo,
// no hay lógica ni datos dinámicos aquí.
const ROLES = [
  {
    nombre: "Titular",
    tag: "role-tag-titular",
    descripcion:
      "Acceso total: todas las secciones, administra usuarios y permisos, y puede usar las acciones irreversibles (borrar historial, formatear registros).",
  },
  {
    nombre: "Administrador",
    tag: null,
    descripcion:
      "Además de lo que el Titular le habilite, puede editar y anular registros (salidas, llenados, inspecciones, mantenimientos, etc.).",
  },
  {
    nombre: "Usuario",
    tag: null,
    descripcion:
      "Ve y usa solo las secciones que el Titular le habilite (Salidas, Llenados, Inspección visual, etc.). Sin ningún permiso, solo ve Inicio.",
  },
  {
    nombre: "Operativo",
    tag: null,
    descripcion:
      "Solo registra llenados de tanque, en una sola pantalla sin menú: el formulario de llenado, el resumen de la semana (lunes a sábado) y los llenados de hoy.",
  },
];

export default function RolesInfo() {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ROLES.map((r) => (
          <div key={r.nombre}>
            <strong>{r.nombre}:</strong> {r.descripcion}
          </div>
        ))}
      </div>
    </div>
  );
}
