// "Solicitudes al almacén" (App Interno, V29) -- ver migration_52.sql y
// app/solicitudes. Funciones compartidas entre pantallas (sin nada de
// servidor, se pueden usar en componentes de cliente).

// Estado de una solicitud según sus códigos (pedido explícito: se recibe
// "codigo por codigo, por si algo no llega"):
// - "pendiente": todavía no llegó ninguno
// - "parcial":   llegaron algunos, faltan otros
// - "recibida":  llegaron todos
export function estadoSolicitud(items) {
  const lista = items || [];
  const recibidos = lista.filter((i) => i.recibido_at).length;
  if (lista.length > 0 && recibidos === lista.length) return "recibida";
  if (recibidos > 0) return "parcial";
  return "pendiente";
}

export const ETIQUETA_ESTADO = {
  pendiente: { texto: "Pendiente", badge: "badge-amarillo" },
  parcial: { texto: "Recibida en parte", badge: "badge-azul" },
  recibida: { texto: "Recibida", badge: "badge-verde" },
};

export function ordenarItems(items) {
  return [...(items || [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}
