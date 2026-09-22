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
      "Puede registrar y editar salidas/tanques y ver las secciones que el Titular le habilite (Reportes, Catálogo, Historial, Changelog, Manual, Movimientos).",
  },
  {
    nombre: "Usuario",
    tag: null,
    descripcion:
      "Registra salidas y llenados de tanque desde el día a día; solo ve el resto de secciones si el Titular se las habilita.",
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
