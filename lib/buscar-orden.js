// V31 — buscador de órdenes por cliente O por No. de orden (Registro de
// Órdenes e Historial de órdenes). Pedido explícito: escribió "001" y salió
// "Ninguna orden coincide". Reglas: el texto tal cual (con ceros: "001"
// encuentra "0001"), y si es un número, también igual numérico ("1"
// encuentra "0001"). Sin tildes ni mayúsculas para el nombre.
function normal(t) {
  return String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function coincideOrden(o, texto, nombreCliente) {
  const q = normal(texto);
  if (!q) return true;
  const nombre = normal(nombreCliente ?? o.cliente_nombre_snapshot ?? o.cliente_nombre);
  if (nombre.includes(q)) return true;
  const numeros = [o.no_orden_fisico, o.folio].filter((n) => n !== null && n !== undefined && n !== "");
  for (const n of numeros) {
    if (normal(n).includes(q)) return true;
  }
  if (/^\d+$/.test(q)) {
    const valor = Number(q);
    if (numeros.some((n) => Number(n) === valor)) return true;
  }
  return false;
}
