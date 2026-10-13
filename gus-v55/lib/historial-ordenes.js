import { formatFechaDDMMAAAADeDate } from "./format";
import { tipoEquipoLabel } from "./tipo-equipo";
import { mismoValor, normalizarValor } from "./cambios";
import { holdActivo, labelTipoHold, detalleHold } from "./holds";
import { componentesRecibidosTexto } from "./informe-mantenimiento";

// Filas "Campo / Antes / Después" de una edición de ordenes_equipos --
// extraído de app/app-clientes/administracion/historial/page.js
// (27-sep-2026) para poder reutilizarlo también en "Bitácora movimientos
// en órdenes" (pedido explícito: "un boton en 'mas'... un registro de
// todas las veces que cualquier orden es editada... para enterarme quien
// cambio que en cada orden") sin duplicar esta lista de campos en dos
// archivos y arriesgar que se desincronicen. `dn` (datos_nuevos) puede
// venir vacío en ediciones de antes de migration_29.sql.
//
// **Ampliado (feedback sobre v52, 6-oct-2026, pedido explícito, con una
// captura de una edición con Antes y Después idénticos: "Hoy en dia veo
// mucha ediciones que estan intactas... No debe de ser").** Muchas de esas
// ediciones SÍ habían cambiado algo, solo que en un campo que esta tabla
// no mostraba: la Nota, la fecha de envío a taller/hidrostática, las
// notificaciones al cliente, el Hold, los componentes recibidos o el
// Informe de mantenimiento (cada "Generar informe" anota una edición de
// la orden). Se agregaron esas filas para que el cambio real se vea
// resaltado. Las ediciones donde de verdad no cambió nada ya no se guardan
// ni se muestran (lib/cambios.js).
//
// Cada fila trae `cambio` (comparando los valores reales, no el texto
// mostrado). Si `dn` solo trae algunas llaves (ej. "Editar datos de la
// orden" guarda solo lo de ese formulario), las que no trae se toman como
// sin cambio -- antes se mostraban como "—" en Después, como si se
// hubieran borrado.
export function filasOrden(d, dn) {
  const f = (iso) => (iso ? formatFechaDDMMAAAADeDate(iso) : "—");
  const texto = (v) => (v == null || String(v).trim() === "" ? "—" : String(v));
  const siNo = (v) => (v ? "Sí" : "No");
  const notifs = (lista) =>
    Array.isArray(lista) && lista.length > 0
      ? lista.map((n) => `${f(n.fecha)} — ${n.medio || ""}`.trim()).join("; ")
      : "—";
  const hold = (holds) => {
    const h = holdActivo(holds);
    return h ? `${labelTipoHold(h)}: ${detalleHold(h)}` : "—";
  };
  const componentes = (c) => (normalizarValor(c) ? componentesRecibidosTexto(c) : "—");

  // Valor "después" de una llave: si `dn` no la trae, no se editó.
  const nuevo = (k) => (dn && Object.prototype.hasOwnProperty.call(dn, k) ? dn[k] : d[k]);

  const fila = (label, claves, formato) => {
    const lista = Array.isArray(claves) ? claves : [claves];
    const valAntes = lista.length === 1 ? d[lista[0]] : lista.map((k) => d[k]);
    const valDespues = lista.length === 1 ? nuevo(lista[0]) : lista.map((k) => nuevo(k));
    const cambio = dn ? !mismoValor(valAntes, valDespues) : true;
    return {
      label,
      antes: formato(valAntes),
      despues: dn ? formato(valDespues) : "—",
      cambio,
    };
  };

  const informeFila = (() => {
    const antes = d.informe_mantenimiento;
    const despues = nuevo("informe_mantenimiento");
    const cambio = dn ? !mismoValor(antes, despues) : true;
    return {
      label: "Informe de mantenimiento",
      antes: antes ? "Generado" : "—",
      despues: !dn ? "—" : !despues ? "—" : !cambio ? (antes ? "Generado" : "—") : antes ? "Actualizado" : "Generado",
      cambio,
    };
  })();

  return [
    fila("No. de orden", "no_orden_fisico", texto),
    fila("Fecha de ingreso", "fecha", f),
    fila("Cliente", "cliente_nombre_snapshot", texto),
    fila("Equipo", ["tipo_equipo", "tipo_equipo_otro"], ([t, o]) => tipoEquipoLabel(t, o) || "—"),
    fila("Servicio a realizar", "que_se_hara", texto),
    fila("Autorización del cliente", ["autorizacion_cliente", "autorizacion_notas"], ([a, n]) =>
      a ? (n ? `${a} — ${n}` : a) : "—"
    ),
    fila("Notas", "notas", texto),
    fila("Componentes recibidos", "regulador_componentes", componentes),
    fila("Hold", "holds", hold),
    fila("Envío a", "envio_a", texto),
    fila("Fecha de envío a taller o proveedor", "fecha_envio", f),
    fila("Se trabajó en tienda", "reparacion_en_tienda", siNo),
    fila("Fecha de envío a prueba hidrostática", "fecha_envio_hidrostatica", f),
    fila("Fecha de retorno a tienda", "fecha_retorno_tienda", f),
    fila("Inspección visual realizada", "inspeccion_visual_realizada", siNo),
    fila("Fecha de listo para entrega", "fecha_listo_entrega", f),
    fila("Verificado por", "verificado_por", texto),
    fila("Notificaciones al cliente", "notificaciones_cliente", notifs),
    fila("Fecha de entrega al cliente", "fecha_entrega_cliente", f),
    fila("Nombre de quien recibe", "nombre_recibe", texto),
    fila("Factura", "factura", texto),
    fila("Códigos a cobrar", "repuestos_usados", texto),
    fila("Nota", "notas_tecnico_regulador", texto),
    informeFila,
    fila("Estado", "estado", texto),
  ];
}

// Filas "Campo / Antes / Después" de una edición de clientes_equipos --
// feature nueva "Editar cliente" (ronda grande de feedback, 27-sep-2026,
// pedido explícito), mismo patrón que filasOrden/filasEquipo.
export function filasCliente(d, dn) {
  const nuevo = (k) => (dn && Object.prototype.hasOwnProperty.call(dn, k) ? dn[k] : d[k]);
  return ["nombre", "telefono"].map((k) => ({
    label: k === "nombre" ? "Nombre" : "Teléfono",
    antes: d[k] || "—",
    despues: dn ? nuevo(k) || "—" : "—",
    cambio: dn ? !mismoValor(d[k], nuevo(k)) : true,
  }));
}
