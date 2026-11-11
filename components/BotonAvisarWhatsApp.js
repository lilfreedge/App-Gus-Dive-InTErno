"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { linkWhatsAppGrupo, mensajeAsignacion } from "@/lib/whatsapp-tecnico";
import { urlPrincipal } from "@/lib/direccion";

// V37 -- Botón "Avisar por WhatsApp" al técnico de una orden. Abre WhatsApp
// (app del teléfono o WhatsApp Web) con el mensaje ya escrito y anota el
// aviso (avisos_tecnicos, migration_70.sql) para verlo en la Bitácora de
// órdenes, en Registro de Órdenes y en la ficha del técnico. La app sabe
// que se abrió WhatsApp, no si de verdad se le dio Enviar.
// V38 -- el aviso va al grupo del taller (pedido explícito: "quise decir al
// grupo", opción A): abre WhatsApp con el mensaje y se escoge el grupo. El
// número de cada técnico se sigue guardando en Mi perfil ("no lo quites,
// déjalo... por si en un futuro hace falta"), pero aquí ya no se usa.
//
// orden: { id, folio, no_orden_fisico, cliente_nombre_snapshot, tipo_equipo,
//          tipo_equipo_otro, equipo_marca_snapshot, equipo_modelo_snapshot, que_se_hara }
// tecnico: { id, full_name, telefono }
// estilo: "boton" (verde grande), "link" (texto verde) o "sutil" (gris,
// solo subrayado -- ficha de la orden, V72/V73, maqueta aprobada: "ve a
// ver si hay manera de que se vea aun mas sutil").
export default function BotonAvisarWhatsApp({ orden, tecnico, miNombre = "", estilo = "boton", texto }) {
  const router = useRouter();
  const supabase = createClient();
  const [avisado, setAvisado] = useState(false);

  function avisar(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const url = typeof window !== "undefined" ? urlPrincipal(`/app-clientes/ordenes/${orden.id}`) : "";
    const mensaje = mensajeAsignacion({ nombre: tecnico?.full_name, orden, url });
    // Primero se abre WhatsApp (si se espera a la base de datos, el
    // navegador puede bloquear la ventana nueva).
    window.open(linkWhatsAppGrupo(mensaje), "_blank", "noopener");
    setAvisado(true);
    supabase
      .from("avisos_tecnicos")
      .insert({
        orden_id: orden.id,
        tecnico_id: tecnico?.id || null,
        tecnico_nombre: tecnico?.full_name || null,
        avisado_por_nombre: miNombre || null,
        medio: "whatsapp_grupo",
      })
      .then(() => router.refresh());
  }

  // V52 (nota: "en vez de decir 'avisar en el grupo' diga 'avisar en el grupo Taller Gus Dive'").
  const etiqueta = texto || (estilo === "boton" ? "Avisar en el grupo Taller Gus Dive" : "Avisar en el grupo Taller Gus Dive");

  if (estilo === "link") {
    return (
      <button
        type="button"
        onClick={avisar}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#1f8f4e", fontWeight: 700, fontSize: 12.5 }}
      >
        {etiqueta}
      </button>
    );
  }

  if (estilo === "sutil") {
    return (
      <button
        type="button"
        onClick={avisar}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "var(--texto-suave)",
          fontWeight: 600,
          fontSize: "inherit",
          textDecoration: "underline",
          textDecorationColor: "var(--borde)",
        }}
      >
        {etiqueta}
      </button>
    );
  }
  return (
    <div>
      <button
        type="button"
        className="btn"
        onClick={avisar}
        style={{ marginTop: 12, background: "#1f8f4e", color: "#fff", border: "none" }}
      >
        {avisado ? `Abrir WhatsApp otra vez` : etiqueta}
      </button>
      <div className="hint-text" style={{ marginTop: 6 }}>
        Se abre WhatsApp con el mensaje ya escrito. Escoges el grupo del taller y le das Enviar.
      </div>
    </div>
  );
}
