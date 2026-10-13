"use client";

import { useCallback, useRef, useState } from "react";

const UMBRAL_PX = 8;

// Arrastre manual del menú superior, basado en Pointer Events (23-sep-2026).
//
// Antes esto usaba el drag & drop NATIVO de HTML5 (atributo `draggable`)
// puesto directamente sobre los mismos <Link> de navegación. Bug
// reportado en vivo: con trackpad, el más mínimo movimiento del mouse
// durante un click (casi inevitable) ya cuenta como "arrastre" para el
// navegador -- disparaba un dragstart/drop real y reordenaba dos botones
// aunque el usuario solo quiso hacer click, y de paso el navegador podía
// no disparar el click normal de esa interacción (por eso a veces
// "navegaba al vecino" en vez de al link que se tocó).
//
// Con este hook el modo arrastre solo se activa si el puntero se mueve
// más de UMBRAL_PX antes de soltar -- por debajo de eso es un click
// normal y el <Link> navega exactamente como siempre, sin tocar nada.
// Se usa igual en TopbarClientes.js (App Clientes) y TopbarClient.js
// (App Interno) -- mismo bug, mismo arreglo en las dos.
export function useReorderDrag({ fijos, setLinks, guardarOrden }) {
  const [sobreHref, setSobreHref] = useState(null);
  const infoRef = useRef(null); // { href, startX, startY, dragging }
  const justDraggedRef = useRef(false);

  const hrefBajoPuntero = useCallback((x, y) => {
    if (typeof document === "undefined") return null;
    const el = document.elementFromPoint(x, y);
    const linkEl = el?.closest?.("[data-nav-href]");
    return linkEl?.getAttribute("data-nav-href") || null;
  }, []);

  function onPointerDown(e, href) {
    if (fijos.includes(href) || e.button !== 0) return;
    infoRef.current = { href, startX: e.clientX, startY: e.clientY, dragging: false };
  }

  function onPointerMove(e, href) {
    const info = infoRef.current;
    if (!info || info.href !== href) return;

    if (!info.dragging) {
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      if (Math.hypot(dx, dy) < UMBRAL_PX) return;
      info.dragging = true;
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {
        // Si el navegador no lo soporta, seguimos igual -- no es crítico,
        // solo hace que hrefBajoPuntero sea la única fuente de verdad.
      }
    }

    const destino = hrefBajoPuntero(e.clientX, e.clientY);
    setSobreHref(destino && destino !== info.href && !fijos.includes(destino) ? destino : null);
  }

  function onPointerUp(e, href) {
    const info = infoRef.current;
    if (!info || info.href !== href) return;
    infoRef.current = null;
    setSobreHref(null);

    if (!info.dragging) return; // click normal -- el <Link> navega solo, no tocamos nada

    justDraggedRef.current = true;
    const destino = hrefBajoPuntero(e.clientX, e.clientY);
    if (!destino || destino === info.href || fijos.includes(destino)) return;

    setLinks((prev) => {
      const lista = [...prev];
      const iOrigen = lista.findIndex((l) => l.href === info.href);
      const iDestino = lista.findIndex((l) => l.href === destino);
      if (iOrigen === -1 || iDestino === -1) return prev;
      const [item] = lista.splice(iOrigen, 1);
      lista.splice(iDestino, 0, item);
      guardarOrden(lista);
      return lista;
    });
  }

  function onPointerCancel(e, href) {
    const info = infoRef.current;
    if (!info || info.href !== href) return;
    infoRef.current = null;
    setSobreHref(null);
  }

  function getItemProps(href) {
    return {
      "data-nav-href": href,
      onPointerDown: (e) => onPointerDown(e, href),
      onPointerMove: (e) => onPointerMove(e, href),
      onPointerUp: (e) => onPointerUp(e, href),
      onPointerCancel: (e) => onPointerCancel(e, href),
    };
  }

  // Puesto en el <nav> (ancestro de todos los <Link>) en fase de
  // "captura" -- por spec del DOM, un listener de captura en un
  // ancestro siempre corre ANTES que el click del propio <Link>, así
  // que llamar preventDefault() acá cancela la navegación de forma
  // confiable justo cuando el gesto que terminó fue un arrastre real
  // (justDraggedRef), y no interfiere en nada con un click normal.
  function onNavClickCapture(e) {
    if (justDraggedRef.current) {
      e.preventDefault();
      justDraggedRef.current = false;
    }
  }

  return { sobreHref, getItemProps, onNavClickCapture };
}
