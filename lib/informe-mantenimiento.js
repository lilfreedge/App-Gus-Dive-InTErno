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
export const COMPONENTES_REGULADOR_DEFS = [
  { id: "primera", label: "Primera etapa" },
  { id: "segunda", label: "Segunda etapa" },
  { id: "octopus", label: "Octopus" },
  { id: "mangueras", label: "Mangueras" },
  { id: "manometro", label: "Manómetro" },
  { id: "otro", label: "Otro" },
];

// "Trabajo realizado" -- chips del formulario del Informe.
export const MANTENIMIENTO_DEFS = [
  { id: "limpieza", label: "Limpieza ultrasónica" },
  { id: "revision", label: "Revisión completa de piezas" },
  { id: "ajuste", label: "Ajuste de presión intermedia" },
  { id: "flujo", label: "Pruebas de flujo (2da etapa y octopus)" },
  { id: "estanqueidad", label: "Pruebas de estanqueidad" },
];

export function componentesRecibidosTexto(componentes) {
  const marcados = COMPONENTES_REGULADOR_DEFS.filter((d) => componentes?.[d.id]).map((d) => d.label);
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

// Valor inicial del informe -- marca/modelo se sugieren desde el equipo
// (snapshot de la orden), pero quedan guardados aparte (informe_
// mantenimiento, no el equipo del cliente) para no pisar su registro
// maestro con lo que se escriba acá.
export function informeDefault(orden, tecnicoSugerido = "") {
  return {
    marca: orden.equipo_marca_snapshot || "",
    modelo: orden.equipo_modelo_snapshot || "",
    serie: "",
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
