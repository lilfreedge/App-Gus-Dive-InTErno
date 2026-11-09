"use client";

import { useEffect, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { IconLink, IconPrint, IconX } from "@/components/icons";

// V62 ("249. ok", maqueta V62): en vez de "Copiar link" (que solo copiaba),
// "Compartir link". Abre tres opciones: copiarlo, mandarlo por WhatsApp con
// un mensaje listo, o ver un código QR para imprimirlo y ponerlo en la
// tienda. Se usa en Control Estudiantes (cursos y "Me interesa") y en Buceos.
//
// ruta: "/estudiante", "/me-interesa" o "/inscripcion/<slug>" (también vale
// un link completo). mensaje: el texto de WhatsApp (el link va al final).
// tituloQr: lo que sale arriba del código al imprimirlo.
export function urlCompleta(ruta) {
  if (/^https?:\/\//.test(ruta)) return ruta;
  return typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ruta;
}

export function svgQr(texto, celda = 6) {
  const qr = qrcode(0, "M");
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ cellSize: celda, margin: 2, scalable: true });
}

export default function CompartirLink({ ruta, etiqueta = "Compartir link", mensaje, tituloQr, avisar, className = "btn secondary vj-btn" }) {
  const [abierto, setAbierto] = useState(false);
  const [qr, setQr] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, [abierto]);

  const url = urlCompleta(ruta);
  const texto = `${mensaje || "Aquí te dejo el link:"} ${url}`;

  function copiar() {
    setAbierto(false);
    try {
      navigator.clipboard
        .writeText(url)
        .then(() => avisar?.("Link copiado"))
        .catch(() => avisar?.(url));
    } catch {
      avisar?.(url);
    }
  }
  function whatsapp() {
    setAbierto(false);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="vj-rep-wrap" ref={caja}>
      <button type="button" className={className} onClick={() => setAbierto((o) => !o)}>
        <IconLink size={16} /> {etiqueta} ▾
      </button>
      {abierto && (
        <div className="vj-rep-menu">
          <button type="button" onClick={copiar}>
            <b>Copiar link</b>
            <span>Para pegarlo donde quieras.</span>
          </button>
          <button type="button" onClick={whatsapp}>
            <b>Mandar por WhatsApp</b>
            <span>&quot;{mensaje || "Aquí te dejo el link:"}…&quot;</span>
          </button>
          <button type="button" onClick={() => (setAbierto(false), setQr(true))}>
            <b>Ver código QR</b>
            <span>Para imprimir y ponerlo en la tienda.</span>
          </button>
        </div>
      )}
      {qr && <VentanaQr url={url} titulo={tituloQr} onCerrar={() => setQr(false)} />}
    </div>
  );
}

function VentanaQr({ url, titulo, onCerrar }) {
  const svg = svgQr(url);
  function imprimir() {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo || "Código QR")}</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;text-align:center;padding:40px 20px;color:#111}
img{height:56px}h1{font-size:28px;margin:18px 0 6px}p{font-size:16px;color:#444;margin:0 0 22px}
.qr{width:360px;max-width:90vw;margin:0 auto}.qr svg{width:100%;height:auto}.u{font-size:13px;color:#666;margin-top:14px;word-break:break-all}</style>
</head><body><img src="${location.origin}/logo-gus-icon.png" alt=""><h1>${esc(titulo || "Gus Dive Center")}</h1><p>Escanea el código con la cámara de tu celular</p>
<div class="qr">${svg}</div><div class="u">${esc(url)}</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`);
    w.document.close();
  }
  return (
    <div className="qr-fondo" onClick={onCerrar}>
      <div className="qr-caja" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="qr-x" onClick={onCerrar} aria-label="Cerrar">
          <IconX size={18} />
        </button>
        <b className="qr-t">{titulo || "Código QR"}</b>
        <div className="qr-img" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="qr-u">{url}</div>
        <button type="button" className="btn btn-primary vj-btn" onClick={imprimir}>
          <IconPrint size={16} /> Imprimir
        </button>
      </div>
    </div>
  );
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

