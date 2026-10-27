"use client";

import { useEffect, useRef, useState } from "react";
import { formatoCel } from "@/lib/viajes/modelo";
import { IconClip, IconSearch, IconX } from "@/components/icons";

// V42 -- El comprobante se ve ahí mismo, encima de la ficha, en vez de abrir
// otra ventana (pedido de Pipe). Foto: tocarla la acerca (y otra vez la
// devuelve). PDF: dentro del visor. "Abrir aparte" queda por si acaso.
export function VisorComprobante({ nombre, url, pdf, cerrar }) {
  const [zoom, setZoom] = useState(null); // null | { ancho, fx, fy, cx, cy }
  const [falla, setFalla] = useState(false);
  const cuerpo = useRef(null);
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useEffect(() => {
    const k = (e) => e.key === "Escape" && cerrarRef.current();
    document.addEventListener("keydown", k);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = antes;
    };
  }, []);
  // Al acercar, deja debajo del dedo el punto que se tocó.
  useEffect(() => {
    const el = cuerpo.current;
    if (!zoom || !el) return;
    const img = el.querySelector("img");
    if (!img) return;
    el.scrollLeft = zoom.fx * img.clientWidth - zoom.cx + img.offsetLeft;
    el.scrollTop = zoom.fy * img.clientHeight - zoom.cy + img.offsetTop;
  }, [zoom]);
  const tocarFoto = (e) => {
    e.stopPropagation();
    if (zoom) return setZoom(null);
    const img = e.currentTarget;
    const r = img.getBoundingClientRect();
    const c = cuerpo.current.getBoundingClientRect();
    setZoom({ ancho: r.width * 2.5, fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height, cx: e.clientX - c.left, cy: e.clientY - c.top });
  };
  return (
    <div className="vj-visor" onClick={() => cerrarRef.current()} role="dialog" aria-label={nombre}>
      <div className="vj-visor-bar" onClick={(e) => e.stopPropagation()}>
        <span className="vj-visor-t">
          <IconClip size={15} />
          <span>{nombre}</span>
        </span>
        {url && (
          <a className="vj-visor-btn" href={url} target="_blank" rel="noreferrer">
            Abrir aparte
          </a>
        )}
        <button className="vj-visor-x" onClick={() => cerrarRef.current()} aria-label="Cerrar">
          <IconX size={18} />
        </button>
      </div>
      <div ref={cuerpo} className={`vj-visor-cuerpo${zoom ? " zoom" : ""}${pdf && url ? " pdf" : ""}`}>
        {!url ? (
          <div className="vj-visor-msg">Cargando…</div>
        ) : pdf ? (
          <iframe className="vj-visor-pdf" src={url} title={nombre} onClick={(e) => e.stopPropagation()} />
        ) : falla ? (
          <div className="vj-visor-msg" onClick={(e) => e.stopPropagation()}>
            Esta foto no se puede mostrar aquí. Toca “Abrir aparte”.
          </div>
        ) : (
          <img src={url} alt={nombre} onClick={tocarFoto} onError={() => setFalla(true)} style={zoom ? { width: zoom.ancho, maxWidth: "none", maxHeight: "none" } : undefined} />
        )}
      </div>
      {url && !pdf && !falla && <div className="vj-visor-pie">{zoom ? "Toca la foto para verla completa" : "Toca la foto para acercarla · toca afuera para cerrar"}</div>}
    </div>
  );
}

// Buscador con la lupa del app (en vez del emoji 🔍 en el placeholder).
export function Buscar({ value, onChange, placeholder, autoFocus, style }) {
  return (
    <div className="vj-buscar" style={style}>
      <IconSearch size={17} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    </div>
  );
}

export function Chip({ c = "gris", children, style }) {
  return (
    <span className={`vj-chip ${c}`} style={style}>
      {children}
    </span>
  );
}

export function Modal({ titulo, sub, cerrar, children }) {
  return (
    <div className="vj-modal-fondo" onClick={cerrar}>
      <div className="vj-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vj-modal-head">
          <div style={{ minWidth: 0 }}>
            <div className="vj-modal-t">{titulo}</div>
            {sub && <div className="hint-text">{sub}</div>}
          </div>
          <button className="vj-modal-x" onClick={cerrar} aria-label="Cerrar">
            <IconX size={16} />
          </button>
        </div>
        <div className="vj-modal-body">{children}</div>
      </div>
    </div>
  );
}

export function IconoWA({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"
      />
      {!on && <line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

export function CampoCel({ value, onChange, className = "", placeholder = "809-000-0000" }) {
  return <input className={className} inputMode="tel" value={value} placeholder={placeholder} onChange={(e) => onChange(formatoCel(e.target.value))} />;
}

export function Atras({ onClick, children }) {
  return (
    <a className="back-link" onClick={onClick} style={{ cursor: "pointer" }}>
      ← {children}
    </a>
  );
}
