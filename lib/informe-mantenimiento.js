// "Informe de mantenimiento" para Reguladores (item 36, nueva feature,
// ronda grande de feedback, 27-sep-2026) -- mockup aprobado Informe.dc.html.
// Pantalla propia, separada de "Actualizar estado de orden" y de
// "Reportes": el técnico llena un informe estructurado (componentes
// recibidos, estado inicial, trabajo realizado, aprobado/no aprobado) y
// se genera un PDF/correo para el cliente, con el mismo formato que el
// resto de los documentos de la app (construirPDFOrdenCliente).
//
// "Componentes recibidos" y "Estado inicial" (daños/problemas) se anotan
// SOLO al registrar la orden (app/app-clientes/ordenes/nueva/form-client.js,
// columnas regulador_componentes/regulador_danos_visibles/
// regulador_problemas_reportados) -- este archivo centraliza sus
// definiciones para que el registro y el Informe nunca se desincronicen.
//
// Cada componente, además de si se marcó recibido, puede llevar un
// detalle de texto libre (28-sep-2026, pedido explícito: "en cada
// componente pon para que se pueda poner el detalle, 1ra etapa marca
// tal, 2da etapa marca tal modelo tal, etc" -- ej. marca/modelo de esa
// pieza en ESTA orden en particular). Shape de cada valor en
// `ordenes_equipos.regulador_componentes`: { presente: boolean, detalle:
// string }. Placeholder por componente, usado en el campo de texto del
// wizard de Registrar orden.
//
// "Mangueras" renombrado a "Manguera de BC" y marcado `soloCheck: true`
// (28-sep-2026, pedido explícito: "cambiar 'mangueras' por 'Manguera de
// BC' y que el completar sea un check") -- a diferencia del resto, este
// componente ya se guarda como booleano puro en el equipo
// (regulador_componentes_detalle.manguera_bc), sin marca/modelo -- no
// tiene sentido pedirle detalle de texto aquí tampoco. `soloCheck` hace
// que el checklist (Registrar orden / Editar datos de la orden) no
// muestre el campo de texto para este componente.
export const COMPONENTES_REGULADOR_DEFS = [
  { id: "primera", label: "Primera etapa", placeholderDetalle: "Marca / modelo (opcional)" },
  { id: "segunda", label: "Segunda etapa", placeholderDetalle: "Marca / modelo (opcional)" },
  { id: "octopus", label: "Octopus", placeholderDetalle: "Marca / modelo (opcional)" },
  { id: "mangueras", label: "Manguera de BC", soloCheck: true },
  { id: "manometro", label: "Manómetro", placeholderDetalle: "Marca / modelo (opcional)" },
  // "(opcional)" quitado del placeholder (feedback en vivo, 29-sep-2026,
  // pedido explícito: "en 'otro > especifica que es (opcional)' quita la
  // palabra (opcional)") -- el campo sigue siendo opcional, solo ya no lo
  // dice ahí (mismo criterio que el resto del checklist, que tampoco lo
  // repite en cada campo).
  { id: "otro", label: "Otro", placeholderDetalle: "Especifica qué es" },
];

// Compatibilidad hacia atrás: hasta v43, cada valor de
// `regulador_componentes` era un booleano plano (`true`/`false`). Desde
// v44 pasa a ser `{ presente, detalle }`, pero las órdenes ya guardadas
// con la forma vieja se siguen leyendo bien -- mismo patrón ya usado con
// los Holds (`esHoldFormaVieja`, lib/holds.js).
export function componentePresente(valor) {
  if (valor && typeof valor === "object") return !!valor.presente;
  return !!valor;
}
export function componenteDetalle(valor) {
  if (valor && typeof valor === "object") return (valor.detalle || "").trim();
  return "";
}

// "Trabajo realizado" -- chips del formulario del Informe.
export const MANTENIMIENTO_DEFS = [
  { id: "limpieza", label: "Limpieza ultrasónica" },
  { id: "revision", label: "Revisión interna" },
  { id: "ajuste", label: "Ajuste de presión intermedia" },
  { id: "flujo", label: "Pruebas de flujo (2da etapa y octopus)" },
  { id: "estanqueidad", label: "Pruebas de estanqueidad" },
];

export function componentesRecibidosTexto(componentes) {
  const marcados = COMPONENTES_REGULADOR_DEFS.filter((d) => componentePresente(componentes?.[d.id])).map((d) => {
    const detalle = componenteDetalle(componentes?.[d.id]);
    return detalle ? `${d.label} (${detalle})` : d.label;
  });
  return marcados.length > 0 ? marcados.join(", ") : "Ninguno indicado.";
}

export function estadoInicialTexto({ danos, problemas }) {
  const partes = [];
  if (danos && danos.trim()) partes.push(`Daños visibles: ${danos.trim()}`);
  if (problemas && problemas.trim()) partes.push(`Problemas reportados: ${problemas.trim()}`);
  return partes.length > 0 ? partes.join(" · ") : "Sin novedades.";
}

export function trabajoRealizadoLista(mantenimiento) {
  return MANTENIMIENTO_DEFS.filter((d) => mantenimiento?.[d.id]).map((d) => d.label);
}

// Valor inicial del informe -- marca/modelo/serie se toman del equipo
// (snapshot de la orden + el registro del equipo), pero quedan guardados
// aparte (informe_mantenimiento, no el equipo del cliente) para no pisar
// su registro maestro. Ahora de solo lectura en el formulario (feedback en
// vivo, 29-sep-2026, pedido explícito: "que la marca y modelo de regulador
// sean intocables, junto al No. de serie") -- antes eran inputs editables
// que el técnico podía (sin querer) desviar de lo que dice la ficha del
// equipo; antes serie ni siquiera se prellenaba, había que volver a
// escribirla a mano aunque ya se supiera.
export function informeDefault(orden, tecnicoSugerido = "", serieEquipo = "") {
  return {
    marca: orden.equipo_marca_snapshot || "",
    modelo: orden.equipo_modelo_snapshot || "",
    serie: serieEquipo || "",
    mantenimiento: {},
    presion: "",
    observacion: "",
    aprobado: null,
    tecnico: tecnicoSugerido,
  };
}

// Filas Campo/Valor para el PDF (mismo componente que ya usan Reportes,
// construirPDFOrdenCliente en lib/reportes-clientes.js) -- la vista web
// del Informe (cliente) se ve más rica (secciones, lista con viñetas,
// banner de aprobado/no aprobado), pero el PDF/correo sigue el mismo
// formato de tabla que el resto de los documentos de la app.
export function filasInformeMantenimiento(orden, informe, { serie } = {}) {
  const marcaModelo = [informe.marca, informe.modelo].filter(Boolean).join(" ");
  const trabajo = trabajoRealizadoLista(informe.mantenimiento);

  const filas = [
    { label: "Cliente", value: [orden.cliente_nombre_snapshot, orden.cliente_telefono].filter(Boolean).join(" · ") || "—" },
    { label: "Equipo", value: marcaModelo || "—" },
    { label: "No. de serie", value: (informe.serie || serie || "").trim() || "—" },
    { label: "Componentes recibidos", value: componentesRecibidosTexto(orden.regulador_componentes) },
  ];

  if (orden.regulador_danos_visibles?.trim() || orden.regulador_problemas_reportados?.trim()) {
    filas.push({ label: "Estado inicial", value: estadoInicialTexto({ danos: orden.regulador_danos_visibles, problemas: orden.regulador_problemas_reportados }) });
  }

  filas.push({ label: "Trabajo realizado", value: trabajo.length > 0 ? trabajo.join(", ") : "Ninguno indicado." });
  if (informe.presion?.trim()) filas.push({ label: "Presión intermedia ajustada", value: informe.presion.trim() });
  if (informe.observacion?.trim()) filas.push({ label: "Observación", value: informe.observacion.trim() });

  filas.push({ label: "Estado del regulador", value: informe.aprobado ? "Aprobado para su uso" : "No aprobado para su uso" });
  filas.push({ label: "Garantía", value: "15 días a partir de la fecha de entrega." });
  filas.push({ label: "Técnico", value: informe.tecnico || "—" });

  return filas;
}
