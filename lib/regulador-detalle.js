// Detalle de componentes de un Regulador, capturado al registrar/editar
// el EQUIPO del cliente (28-sep-2026, pedido explícito: "al momento de
// registar regulador, que pida para llenar los componenstes: 1ra
// etapa___ 2da etapa___ Octopus___ Manómetro___ Manguera de BC: si o
// no"). Se guarda en equipos_del_cliente.regulador_componentes_detalle
// (ver migration_38.sql) -- shape: { primera, segunda, octopus,
// manometro (texto libre, opcional cada uno), manguera_bc (true/false/
// null) }.
export const REGULADOR_DETALLE_CAMPOS = [
  { id: "primera", label: "1ra etapa" },
  { id: "segunda", label: "2da etapa" },
  { id: "octopus", label: "Octopus" },
  { id: "manometro", label: "Manómetro" },
];

// Segunda parte del pedido: que esto sirva de default al registrar una
// ORDEN para este mismo equipo, en el checklist "Componentes recibidos"
// que ya existía (COMPONENTES_REGULADOR_DEFS, lib/informe-mantenimiento.js).
// Cada campo de texto no vacío del detalle del equipo cuenta como "sí,
// este componente es parte del equipo" -- se marca recibido por default,
// y el técnico lo puede desmarcar si ese día no lo trajo. La Manguera de
// BC mapea al checkbox genérico "mangueras" del checklist (no hay uno
// específico de BC ahí).
//
// Desde v44 (pedido explícito: "en cada componente pon para que se
// pueda poner el detalle") cada valor del checklist es
// `{ presente, detalle }`, no un booleano plano -- el texto guardado en
// el equipo se precarga también como detalle de esta orden (el técnico
// lo puede corregir si en esta visita en particular es distinto).
export function prefillComponentesRecibidos(detalle) {
  if (!detalle) return {};
  const out = {};
  const camposTexto = [
    ["primera", "primera"],
    ["segunda", "segunda"],
    ["octopus", "octopus"],
    ["manometro", "manometro"],
  ];
  for (const [idChecklist, campoEquipo] of camposTexto) {
    const texto = detalle[campoEquipo]?.trim?.() || "";
    if (texto) out[idChecklist] = { presente: true, detalle: texto };
  }
  if (detalle.manguera_bc === true) out.mangueras = { presente: true, detalle: "" };
  return out;
}

// Texto corto para mostrar el detalle ya guardado (ficha del equipo,
// diff de Historial) -- solo lista lo que sí tiene algo.
export function detalleComponentesTexto(detalle) {
  if (!detalle) return "Sin detalle de componentes guardado.";
  const partes = REGULADOR_DETALLE_CAMPOS.filter((c) => detalle[c.id]?.trim?.()).map(
    (c) => `${c.label}: ${detalle[c.id].trim()}`
  );
  if (detalle.manguera_bc === true) partes.push("Manguera de BC: Sí");
  else if (detalle.manguera_bc === false) partes.push("Manguera de BC: No");
  return partes.length > 0 ? partes.join(" · ") : "Sin detalle de componentes guardado.";
}
