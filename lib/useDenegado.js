"use client";

import { useCallback, useState } from "react";

// "Click denegado" (pedido explícito, ronda grande de feedback,
// 27-sep-2026: "cuando un boton que no funcione, si alguien le da click y
// el boton no tiene ninguna funcion, que se vea como el click denegado,
// le llegas? pero que no se quede sin hacer nada porque uno cree que es
// un error del app") -- hook reutilizable para dar feedback visual
// (sacudida + borde rojo, clase .denegado-shake en globals.css, ~350ms)
// cuando alguien hace click en un control bloqueado que a propósito NO
// usa el atributo `disabled` nativo (ese ni deja disparar el evento
// onClick, y por eso el click no da ninguna señal de "esto es a
// propósito, no un error").
//
// Uso:
//   const denegado = useDenegado();
//   <div className={denegado.clase("miPaso")} onClick={() => denegado.denegar("miPaso")}>
//
// Primer uso: pasos bloqueados del wizard de "Actualizar estado de
// orden" (app/app-clientes/ordenes/[id]/editar/form-client.js).
export function useDenegado(duracionMs = 350) {
  const [activo, setActivo] = useState(null);

  const denegar = useCallback(
    (id) => {
      setActivo(id);
      setTimeout(() => {
        setActivo((actual) => (actual === id ? null : actual));
      }, duracionMs);
    },
    [duracionMs]
  );

  const clase = useCallback(
    (id, claseBase = "") => `${claseBase} ${activo === id ? "denegado-shake" : ""}`.trim(),
    [activo]
  );

  return { activo, denegar, clase };
}
