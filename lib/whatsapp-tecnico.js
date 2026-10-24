import { tipoEquipoLabel } from "@/lib/tipo-equipo";

// V37 -- Aviso al técnico por WhatsApp con un link (pedido explícito: "vamos
// a poner un link que te mande a WhatsApp con un mensaje que diga 'hola
// (nombre), tienes bla bla bla'"; mensaje aprobado "está bien ahí"). Se
// abre WhatsApp con el mensaje escrito y quien asigna solo le da Enviar
// (sale de su propio WhatsApp; en la tienda, el de la tienda).

// Número para wa.me: solo dígitos. Los de República Dominicana (809, 829,
// 849) con 10 dígitos llevan el 1 delante.
export function numeroWhatsApp(telefono) {
  const d = String(telefono || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) return `1${d}`;
  return d;
}

export function equipoTexto(o) {
  return [tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro), o.equipo_marca_snapshot, o.equipo_modelo_snapshot]
    .filter((x) => x && String(x).trim())
    .join(" ");
}

export function mensajeAsignacion({ nombre, orden, url }) {
  const primer = String(nombre || "").trim().split(/\s+/)[0] || "";
  const lineas = [
    `Hola${primer ? ` ${primer}` : ""}, tienes una orden asignada:`,
    `No. ${orden.no_orden_fisico ?? orden.folio} · ${equipoTexto(orden) || "Equipo"}`,
  ];
  if (orden.cliente_nombre_snapshot) lineas.push(`Cliente: ${orden.cliente_nombre_snapshot}`);
  if (orden.que_se_hara) lineas.push(`Servicio: ${orden.que_se_hara}`);
  if (url) lineas.push(`Mírala en la app: ${url}`);
  return lineas.join("\n");
}

// V38 (pedido explícito: "el mensaje de whatsapp, quise decir al grupo";
// opción A de maqueta-v38.html: siempre al grupo). Un link de WhatsApp no
// puede abrir un grupo directo: sin número, WhatsApp abre con el mensaje
// escrito y deja escoger el chat (el grupo del taller sale en recientes).
export function linkWhatsAppGrupo(texto) {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function linkWhatsApp(telefono, texto) {
  const n = numeroWhatsApp(telefono);
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}
