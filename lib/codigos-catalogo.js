// V114 (pedido explícito, 221: "claro" a que antes de guardar se revise si
// el código ya existe, sin importar mayúsculas, espacios ni guion, con un
// aviso claro). La base ya bloquea el código exactamente igual
// (piezas_catalogo_codigo_unique, migration_56), pero "REG-5126",
// "reg-5126" y "REG 5126" pasaban como distintos y el aviso era el error
// técnico. Esto se revisa en Registrar código y en Editar código.

export function claveCodigo(codigo) {
  return String(codigo || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[\s\-_.\/]/g, "");
}

export function textoRepetido(p) {
  return `Ese código ya existe: ${[p.codigo, p.nombre].filter(Boolean).join(" · ")}${p.activo === false ? " (inactivo)" : ""}.`;
}

// Devuelve el código del catálogo que choca con `codigo` (otro que no sea
// `excluirId`), o null. Si la consulta falla, deja seguir: la base sigue
// bloqueando el igual exacto.
export async function codigoRepetido(supabase, codigo, excluirId = null) {
  const clave = claveCodigo(codigo);
  if (!clave) return null;
  const { data, error } = await supabase.from("piezas_catalogo").select("id, codigo, nombre, activo");
  if (error) return null;
  return (data || []).find((p) => p.id !== excluirId && claveCodigo(p.codigo) === clave) || null;
}

// Por si dos personas guardan el mismo código al mismo tiempo: el aviso de
// la base (código igual) en palabras sencillas.
export function esErrorRepetido(err) {
  return err?.code === "23505" || /duplicate key|unique/i.test(err?.message || "");
}
