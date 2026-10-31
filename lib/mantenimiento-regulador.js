// V50 -- Mantenimiento de los reguladores de la tienda (App Interno).
//
// Componentes del regulador al registrar su mantenimiento (nota "App Gus
// interno"; maqueta-v50-notas.html, pregunta 7: "si. Pero Cambia 'Así lo
// tenemos guardado. Si es otro, toca "Cambió" y actualizalo por favor'").
// Salen como están guardados en el regulador; si uno es otro, se toca
// "Cambió" y se escribe el nuevo. Al guardar, el mantenimiento anota
// `componentes_cambios` = [{ campo, etiqueta, antes, despues }] y la base
// de datos le pone el componente nuevo al regulador (trigger de
// migration_75.sql).

export const TEXTO_COMPONENTES = 'Así lo tenemos guardado. Si es otro, toca "Cambió" y actualízalo por favor.';

export const COMPONENTES_ALQUILER = [
  { campo: "primera_etapa", etiqueta: "1ra etapa" },
  { campo: "segunda_etapa", etiqueta: "2da etapa" },
  { campo: "octopus", etiqueta: "Octopus" },
  { campo: "manometro", etiqueta: "Manómetro" },
  { campo: "profundimetro", etiqueta: "Profundímetro" },
];

const limpio = (v) => String(v ?? "").trim();

// `nuevos`: { [campo]: texto } solo de los que se tocaron como "Cambió".
// Devuelve los que de verdad cambiaron (escritos y distintos de lo de antes).
export function componentesCambiados(regulador, nuevos) {
  return COMPONENTES_ALQUILER.filter((c) => nuevos && Object.prototype.hasOwnProperty.call(nuevos, c.campo))
    .map((c) => ({ campo: c.campo, etiqueta: c.etiqueta, antes: limpio(regulador?.[c.campo]) || null, despues: limpio(nuevos[c.campo]) }))
    .filter((c) => c.despues && c.despues !== (c.antes || ""));
}

// "2da etapa Cressi XS2 → Apeks XTX50 · Profundímetro — → Suunto"
export function cambiosTexto(cambios) {
  if (!Array.isArray(cambios) || !cambios.length) return "";
  return cambios.map((c) => `${c.etiqueta} ${c.antes || "—"} → ${c.despues}`).join(" · ");
}

// Detalle de un mantenimiento en una línea (lista de mantenimientos,
// Movimientos y reportes). Antes el reporte decía "Presión intermedia: Sí"
// y mostraba mal los o-rings (eran de la forma de antes de la V31).
export function detalleMantenimientoTexto(m) {
  const orings = Array.isArray(m?.o_rings)
    ? m.o_rings.map((r) => (r?.descripcion || "") + (r?.parte ? ` (${r.parte})` : "")).filter(Boolean).join(", ")
    : limpio(m?.o_rings);
  return [
    `Limpieza ultrasonido: ${m?.limpieza_ultrasonido ? "Sí" : "No"}`,
    `Presión intermedia: ${limpio(m?.presion_intermedia) || "—"}`,
    `O-rings: ${orings || "Ninguno"}`,
  ].join(" · ");
}
