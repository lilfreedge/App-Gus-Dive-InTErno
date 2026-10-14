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
    nombre: "Roles creados (abajo)",
    tag: null,
    descripcion:
      "Tienen exactamente los accesos que se marquen en el rol. Un rol puede tener como pantalla de inicio la de llenados (como Operativo).",
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
