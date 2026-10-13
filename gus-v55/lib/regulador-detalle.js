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
  // Profundímetro (1-oct-2026, pedido explícito, item 11) -- debajo de
  // Manómetro, mismo patrón de campo de texto libre.
  { id: "profundimetro", label: "Profundímetro" },
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
// marca/modelo (28-sep-2026, feedback en vivo, item 15: "registrando esta
// orden no se me puso automatico la 1ra etapa del regulador, en este caso
// debio de decir Cressi AC25") -- mismo fallback que ya usa
// DetalleComponentesRegulador para el equipo: si el detalle guardado en el
// equipo todavía no tiene "primera" (equipos creados/editados antes de ese
// auto-relleno, o cuyo campo se dejó vacío a mano), se usa "Marca Modelo"
// del equipo como detalle de la "Primera etapa" al prellenar el checklist de
// esta orden. Totalmente editable después, igual que el resto.
export function prefillComponentesRecibidos(detalle, marca = "", modelo = "") {
  if (!detalle) detalle = {};
  const out = {};
  const camposTexto = [
    ["primera", "primera"],
    ["segunda", "segunda"],
    ["octopus", "octopus"],
    ["manometro", "manometro"],
    ["profundimetro", "profundimetro"],
  ];
  for (const [idChecklist, campoEquipo] of camposTexto) {
    const texto = detalle[campoEquipo]?.trim?.() || "";
    if (texto) out[idChecklist] = { presente: true, detalle: texto };
  }
  if (!out.primera) {
    const marcaModelo = [marca, modelo].map((v) => (v || "").trim()).filter(Boolean).join(" ");
    if (marcaModelo) out.primera = { presente: true, detalle: marcaModelo };
  }
  if (detalle.manguera_bc === true) out.mangueras = { presente: true, detalle: "" };
  return out;
}

// Arma la actualización de equipos_del_cliente.regulador_componentes_detalle
// a partir de lo que quedó en el checklist "Componentes recibidos" de una
// orden -- inverso de `prefillComponentesRecibidos` (28-sep-2026, pedido
// explícito: "quita boton de 'actualizar detalle del equipo'... que se
// actualice a segun uno llene en la info que viene ya escrita por
// default" -- reemplaza el botón manual "✎ Actualizar detalle del
// equipo" que existía antes). Se usa al registrar Y al editar una orden.
//
// Solo mira los componentes marcados como recibidos (presente: true) --
// uno que no se marcó ese día (el cliente no lo trajo) NO borra el
// detalle ya guardado en el equipo; eso no significa que el equipo dejó
// de tener esa pieza permanentemente, solo que hoy no vino. Devuelve
// `null` cuando no hay ningún cambio real que guardar (para no anotar
// una "edición" vacía en el historial del equipo cada vez que se
// registra o edita una orden y todo coincide con lo ya guardado).
export function detalleEquipoActualizadoDesdeOrden(detalleEquipoActual, componentesRecibidos) {
  const actual = detalleEquipoActual || {};
  const cambios = {};
  const camposTexto = [
    ["primera", "primera"],
    ["segunda", "segunda"],
    ["octopus", "octopus"],
    ["manometro", "manometro"],
    ["profundimetro", "profundimetro"],
  ];
  for (const [idChecklist, campoEquipo] of camposTexto) {
    const valor = componentesRecibidos?.[idChecklist];
    if (!valor?.presente) continue;
    const nuevoTexto = (valor.detalle || "").trim();
    if (nuevoTexto && nuevoTexto !== (actual[campoEquipo] || "").trim()) {
      cambios[campoEquipo] = nuevoTexto;
    }
  }
  if (componentesRecibidos?.mangueras?.presente && actual.manguera_bc !== true) {
    cambios.manguera_bc = true;
  }
  return Object.keys(cambios).length > 0 ? { ...actual, ...cambios } : null;
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

// Filas Campo/Antes/Después, una por componente (28-sep-2026, pedido
// explícito: "pon las ediciones de equipos mas detallado, que aparezcan
// todos los componentes before and after") -- reemplaza la fila única
// combinada (que mezclaba los 5 componentes en un solo texto) en el
// Historial de App Equipos de clientes, para poder ver de un vistazo
// cuál componente puntual cambió.
export function filasDetalleComponentes(detalleAntes, detalleDespues) {
  const a = detalleAntes || {};
  const dp = detalleDespues || {};
  const filas = REGULADOR_DETALLE_CAMPOS.map((c) => ({
    label: c.label,
    antes: a[c.id]?.trim?.() || "—",
    despues: dp[c.id]?.trim?.() || "—",
  }));
  const mangueraTexto = (v) => (v === true ? "Sí" : v === false ? "No" : "—");
  filas.push({
    label: "Manguera de BC",
    antes: mangueraTexto(a.manguera_bc),
    despues: mangueraTexto(dp.manguera_bc),
  });
  return filas;
}
