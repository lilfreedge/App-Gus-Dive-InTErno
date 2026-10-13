"use client";

import { useState } from "react";

// Lightbox simple para una foto (item 23, pedido explícito, 26-sep-2026:
// "cuando se le de click a la foto, que se abra ahi mismo, no en otra
// ventana") -- antes la ficha de la orden abría foto_url en una pestaña
// nueva con un <a target="_blank">. Reusa .modal-overlay (fondo oscuro,
// centrado, click afuera cierra) del resto de la app.
export default function FotoLightbox({ src, alt = "Foto", thumbSize = 110 }) {
  const [abierta, setAbierta] = useState(false);

  if (!src) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        style={{ display: "inline-block", padding: 0, border: "none", background: "none", cursor: "pointer" }}
        aria-label="Ver foto ampliada"
      >
        <img
          src={src}
          alt={alt}
          style={{
            width: thumbSize,
            height: thumbSize,
            objectFit: "cover",
            borderRadius: 10,
            border: "1px solid var(--borde)",
            display: "block",
          }}
        />
      </button>

      {abierta && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAbierta(false);
          }}
        >
          <div style={{ position: "relative", maxWidth: "92vw", maxHeight: "92vh" }}>
            <img src={src} alt={alt} style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 10, display: "block" }} />
            <button
              type="button"
              onClick={() => setAbierta(false)}
              className="icon-btn"
              aria-label="Cerrar"
              style={{ position: "absolute", top: -14, right: -14, background: "#fff" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
