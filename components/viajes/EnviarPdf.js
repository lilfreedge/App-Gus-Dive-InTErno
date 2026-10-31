"use client";

import { useEffect, useRef, useState } from "react";
import { pdfListado, nombrePdfListado } from "@/lib/viajes/pdf-listado";
import { IconoWA } from "./Piezas";

// V52 -- "Enviar por WhatsApp" del listado para el proveedor: manda el PDF,
// no el texto ("42"). En el celular abre el menú de compartir con el PDF
// adjunto (se escoge WhatsApp y el chat). Donde no se puede compartir un
// archivo (algunas computadoras), baja el PDF para arrastrarlo al chat.
// El PDF se prepara antes de tocar el botón: si se prepara después, el
// iPhone no deja abrir el menú de compartir.
export default function EnviarPdf({ v, g, avisar, className = "btn btn-primary vj-btn", texto = "Enviar por WhatsApp" }) {
  const [archivo, setArchivo] = useState(null);
  const clave = JSON.stringify([v.nombre, v.fecha, v.salida, g]);
  const ultima = useRef(null);

  useEffect(() => {
    let vivo = true;
    ultima.current = clave;
    setArchivo(null);
    pdfListado(v, g)
      .then((bytes) => {
        if (!vivo || ultima.current !== clave) return;
        setArchivo(new File([bytes], nombrePdfListado(v, g), { type: "application/pdf" }));
      })
      .catch(() => vivo && setArchivo(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  function bajar(f) {
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    avisar("Se bajó el PDF. Arrástralo al chat en WhatsApp para mandarlo.");
  }

  function enviar() {
    if (!archivo) return;
    let puede = false;
    try {
      puede = !!navigator.canShare && navigator.canShare({ files: [archivo] });
    } catch {}
    if (!puede) return bajar(archivo);
    navigator.share({ files: [archivo] }).catch((e) => {
      if (e?.name !== "AbortError") bajar(archivo);
    });
  }

  return (
    <button className={className} onClick={enviar} disabled={!archivo}>
      <IconoWA on /> {archivo === null ? "Preparando el PDF…" : archivo === false ? "No se pudo hacer el PDF" : texto}
    </button>
  );
}
