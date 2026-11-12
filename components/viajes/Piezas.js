"use client";

import { useEffect, useRef, useState } from "react";
import { formatoCel, soloDigitos, esCelExtranjero } from "@/lib/viajes/modelo";
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

// V65 ("284. ok"): el país al lado del número (por defecto RD +1). De otro
// país, el valor queda "+código número" (se guarda solo con los dígitos).
export const PAISES_CEL = [
  { k: "do", t: "RD", c: "1", n: "República Dominicana" },
  { k: "us", t: "EE.UU.", c: "1", n: "Estados Unidos, Puerto Rico o Canadá" },
  { k: "es", t: "España", c: "34" },
  { k: "ve", t: "Venezuela", c: "58" },
  { k: "ht", t: "Haití", c: "509" },
  { k: "co", t: "Colombia", c: "57" },
  { k: "mx", t: "México", c: "52" },
  { k: "ar", t: "Argentina", c: "54" },
  { k: "cu", t: "Cuba", c: "53" },
  { k: "it", t: "Italia", c: "39" },
  { k: "fr", t: "Francia", c: "33" },
  { k: "de", t: "Alemania", c: "49" },
  { k: "gb", t: "Reino Unido", c: "44" },
  { k: "otro", t: "Otro", c: "" },
];
function paisDe(valor) {
  if (!esCelExtranjero(valor)) return null;
  const d = soloDigitos(valor);
  return [...PAISES_CEL].filter((p) => p.c && p.c !== "1").sort((a, b) => b.c.length - a.c.length).find((p) => d.startsWith(p.c)) || PAISES_CEL.find((p) => p.k === "otro");
}
export function CampoCel({ value, onChange, className = "", placeholder = "809-000-0000", onKeyDown }) {
  const [elegido, setElegido] = useState(null);
  const auto = paisDe(value);
  const pais = auto || (elegido && elegido.c === "1" ? elegido : null) || (elegido?.k === "otro" ? elegido : null) || PAISES_CEL[0];
  const extranjero = pais.c !== "1";
  const resto = extranjero ? soloDigitos(value).slice(pais.c.length) : value;
  function cambiarPais(k) {
    const p = PAISES_CEL.find((x) => x.k === k) || PAISES_CEL[0];
    setElegido(p);
    const num = extranjero ? soloDigitos(value).slice(pais.c.length) : soloDigitos(value);
    if (p.c === "1") onChange(formatoCel(num.slice(-10)));
    else if (p.k === "otro") onChange(num ? `+${num}` : "+");
    else onChange(`+${p.c}${num}`);
  }
  function cambiarNumero(t) {
    // V74 (pedido explícito, con foto: "si pongo un numero de mas por
    // error asume que ya es un numero de otro pais... el formato deberia
    // estar bloqueado solo el de RD... en dado caso que vayan a poner
    // numero fuera de RD, tienen que cambiarlo [el país]") -- antes, al
    // escribir, formatoCel() decidía solo si el número ya no parecía de
    // RD/EE.UU. (por ejemplo, 11 dígitos sin empezar en "1") y cambiaba el
    // selector de país él mismo. Ahora, mientras el país escogido sea
    // RD/EE.UU., el formato se queda así pase lo que pase con lo que se
    // escriba (un dígito de más se recorta, no cambia de país); para un
    // número de otro país hay que escoger el país arriba.
    if (!extranjero) {
      let d = soloDigitos(t);
      if (d.length === 11 && d[0] === "1") d = d.slice(1);
      d = d.slice(0, 10);
      return onChange(d.length > 6 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d);
    }
    if (pais.k === "otro") return onChange(`+${soloDigitos(t)}`);
    onChange(`+${pais.c}${soloDigitos(t)}`);
  }
  return (
    <span className="campo-cel">
      <select className={`campo-cel-pais${className.includes("pb-input") ? " en-pb" : ""}`} value={pais.k} onChange={(e) => cambiarPais(e.target.value)} aria-label="País del celular">
        {PAISES_CEL.map((p) => (
          <option key={p.k} value={p.k}>
            {p.t} {p.c ? `+${p.c}` : "+…"}
          </option>
        ))}
      </select>
      <input className={className} inputMode="tel" value={pais.k === "otro" ? (value || "+") : resto} placeholder={extranjero ? (pais.k === "otro" ? "+código y número" : "Número") : placeholder} onChange={(e) => cambiarNumero(e.target.value)} onKeyDown={onKeyDown} />
    </span>
  );
}

export function Atras({ onClick, children }) {
  return (
    <a className="back-link" onClick={onClick} style={{ cursor: "pointer" }}>
      ← {children}
    </a>
  );
}
