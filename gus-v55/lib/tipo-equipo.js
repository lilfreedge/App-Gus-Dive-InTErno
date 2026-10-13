// Etiquetas de tipo de equipo de cliente, singularizadas para mostrar en
// pantalla (pedido explícito, 23-sep-2026: "cambiar reguladores por
// regulador y tanques por tanque. al igual que en las otras partes donde
// figure asi"). El valor guardado en la base de datos (columna
// tipo_equipo, en equipos_del_cliente y en el snapshot de ordenes_equipos)
// sigue en plural -- Tanques/Reguladores -- no se tocó, para no romper
// comparaciones ya existentes (CON_SERIE, "Tanques" sin marca/modelo,
// filtros de historial) ni los datos ya guardados. Mismo patrón que
// "Pendientes por entregar" en el hub, que tampoco cambió el estado real
// "Pendiente por despachar" -- separación entre lo que se guarda y lo
// que se muestra.
const TIPO_EQUIPO_DISPLAY = {
  Tanques: "Tanque",
  Reguladores: "Regulador",
};

// Para dropdowns/opciones y cualquier lugar que muestre el tipo tal cual
// (sin el caso "Otro").
export function tipoEquipoDisplay(tipo) {
  return TIPO_EQUIPO_DISPLAY[tipo] || tipo;
}

// Para el patrón repetido "si es Otro, usa el texto libre; si no, el
// tipo" -- ahora con el tipo ya singularizado.
export function tipoEquipoLabel(tipo, tipoOtro) {
  if (tipo === "Otro") return tipoOtro;
  return tipoEquipoDisplay(tipo);
}
