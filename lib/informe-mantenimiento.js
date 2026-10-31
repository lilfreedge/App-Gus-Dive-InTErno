import { formatFechaDDMMAAAADeDate } from "./format";

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
  // Profundímetro (1-oct-2026, pedido explícito, item 11: "Agregar
  // 'profundímetro' en reguladores... debe de estar debajo de
  // 'manómetro'") -- mismo patrón de campo de texto libre que el resto.
  { id: "profundimetro", label: "Profundímetro", placeholderDetalle: "Marca / modelo (opcional)" },
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
  if (problemas && problemas.trim()) partes.push(`Problemas reportados por cliente: ${problemas.trim()}`);
  return partes.length > 0 ? partes.join(" · ") : "Sin novedades.";
}

export function trabajoRealizadoLista(mantenimiento) {
  return MANTENIMIENTO_DEFS.filter((d) => mantenimiento?.[d.id]).map((d) => d.label);
}

// V50 -- Qué tiene ya el informe que está a medias (informes_borrador), en
// una línea para la ficha: "Ya tiene Limpieza ultrasónica y Revisión
// interna." Si todavía no tiene nada marcado, null.
export function borradorYaTiene(informe) {
  const partes = trabajoRealizadoLista(informe?.mantenimiento);
  if ((informe?.presion || "").trim()) partes.push(`presión ${presionConUnidad(informe.presion)}`);
  if (Array.isArray(informe?.orings) && informe.orings.length) partes.push("o-rings");
  if (informe?.aprobado === true) partes.push("Aprobado");
  if (informe?.aprobado === false) partes.push("No aprobado");
  if (!partes.length) return null;
  const lista = partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
  return `Ya tiene ${lista}.`;
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
// "Nota" prellenada con la del Seguimiento (1-oct-2026, pedido explícito:
// "vincularlo con la sección que aparece en 'formulario' llamada
// 'observación'... que aparezca escrito por default lo que escriban en el
// seguimiento y que sea editable") -- mismo criterio que marca/modelo/
// serie: esto es el valor INICIAL antes de que exista un informe guardado
// para esta orden (ver el spread `...(orden.informe_mantenimiento || {})`
// en form-client.js, que pisa este default si el Informe ya se había
// generado antes) -- así un cambio posterior a la Nota del Seguimiento no
// sobreescribe en silencio la Nota de un Informe ya generado.
export function informeDefault(orden, tecnicoSugerido = "", serieEquipo = "") {
  return {
    marca: orden.equipo_marca_snapshot || "",
    modelo: orden.equipo_modelo_snapshot || "",
    serie: serieEquipo || "",
    mantenimiento: {},
    presion: "",
    // V40: la Nota del técnico es interna; la Nota del informe (para el
    // cliente) empieza vacía. El Titular la puede traer a mano con el botón.
    observacion: "",
    orings: [],
    recomendacion: null,
    aprobado: null,
    tecnico: tecnicoSugerido,
  };
}

// Presión intermedia con su unidad (feedback sobre v52, 6-oct-2026, pedido
// explícito: 'Agrega "psi" despues del numero. Por ejemplo: "135 psi"').
// Si el técnico ya escribió la unidad ("140 PSI", "140psi"), no se repite
// -- se normaliza a "140 psi".
export function presionConUnidad(valor) {
  const limpio = (valor || "").trim().replace(/\s*psi\s*$/i, "").trim();
  return limpio ? `${limpio} psi` : "";
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
  // Renombrada de "Presión intermedia ajustada" (feedback sobre v51) y con
  // "psi" al final (feedback sobre v52) -- mismo texto que la vista web.
  if (presionConUnidad(informe.presion)) filas.push({ label: "Presión intermedia", value: presionConUnidad(informe.presion) });
  // "Cambio de o-rings" (1-oct-2026, nueva feature, pedido explícito) --
  // lista armada con el mismo patrón de "Códigos a cobrar" (agregar uno
  // por uno), ver orings en form-client.js. V32: va antes de "Nota".
  if ((informe.orings || []).length > 0) {
    filas.push({ label: "Cambio de o-rings", value: informe.orings.join(", ") });
  }
  // Renombrada a "Nota" (1-oct-2026, pedido explícito) -- mismo campo
  // `observacion` de siempre.
  if (informe.observacion?.trim()) filas.push({ label: "Nota", value: informe.observacion.trim() });

  filas.push({ label: "Estado del regulador", value: informe.aprobado ? "Aprobado para su uso" : "No aprobado para su uso" });
  filas.push({ label: "Garantía", value: "15 días a partir de la fecha de entrega." });
  filas.push({ label: "Técnico", value: informe.tecnico || "—" });
  // "Recomendación de próximo mantenimiento" (1-oct-2026, nueva feature,
  // pedido explícito) -- al final, igual que en la vista web. El valor
  // guardado es "6"/"12" (meses); acá se muestra en texto.
  if (informe.recomendacion === "6" || informe.recomendacion === "12") {
    filas.push({ label: "Recomendación de próximo mantenimiento", value: `En ${informe.recomendacion} meses` });
  }

  return filas;
}

// V32 -- Las secciones del Informe (cliente), en orden. Una sola lista para
// las tres salidas: la vista en el app (informe/form-client.js), el correo
// (el informe va DENTRO del correo, con el mismo diseño) y el PDF adjunto
// en hoja carta (lib/informe-documento.js). Pedido explícito: "Cambio de
// o-rings" va ANTES de "Nota", y el correo/PDF dejan la tabla Campo/Valor
// para verse igual que en el app.
//
// Cada sección: { titulo, texto } o { titulo, items } (viñetas); `detalle`
// es la línea chica gris debajo (solo en Equipo).
export function seccionesInforme(orden, informe) {
  const numero = orden.no_orden_fisico ?? orden.folio;
  const trabajo = trabajoRealizadoLista(informe.mantenimiento);
  const secciones = [
    {
      titulo: "Cliente",
      texto: [orden.cliente_nombre_snapshot, orden.cliente_telefono].filter(Boolean).join(" · ") || "—",
    },
    {
      titulo: "Equipo",
      texto: [informe.marca, informe.modelo].filter(Boolean).join(" ") || "—",
      detalle:
        `No. de orden ${numero} · Ingreso ${orden.fecha ? formatFechaDDMMAAAADeDate(String(orden.fecha).slice(0, 10)) : "—"}` +
        (informe.serie?.trim() ? ` · No. de serie ${informe.serie.trim()}` : ""),
    },
    { titulo: "Componentes recibidos", texto: componentesRecibidosTexto(orden.regulador_componentes) },
  ];
  if (orden.regulador_danos_visibles?.trim() || orden.regulador_problemas_reportados?.trim()) {
    secciones.push({
      titulo: "Estado inicial",
      texto: estadoInicialTexto({ danos: orden.regulador_danos_visibles, problemas: orden.regulador_problemas_reportados }),
    });
  }
  secciones.push(
    trabajo.length > 0
      ? { titulo: "Trabajo realizado", items: trabajo }
      : { titulo: "Trabajo realizado", texto: "Ninguno indicado." }
  );
  if (presionConUnidad(informe.presion)) secciones.push({ titulo: "Presión intermedia", texto: presionConUnidad(informe.presion) });
  if ((informe.orings || []).length > 0) secciones.push({ titulo: "Cambio de o-rings", items: informe.orings });
  if (informe.observacion?.trim()) secciones.push({ titulo: "Nota", texto: informe.observacion.trim() });
  return secciones;
}

// Lo que va después del recuadro de aprobado (mismo orden que el app).
export function recomendacionInformeTexto(informe) {
  return informe.recomendacion === "6" || informe.recomendacion === "12" ? `En ${informe.recomendacion} meses.` : null;
}

export const GARANTIA_INFORME = "Garantía de 15 días a partir de la fecha de entrega.";
export const GRACIAS_INFORME = "Gracias por confiar en Gus Dive Center para el mantenimiento de tu equipo de buceo.";

