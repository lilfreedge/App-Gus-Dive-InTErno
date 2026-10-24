"use client";

import { useEffect, useRef, useState } from "react";

// V35 -- Buscador para los historiales (pedido explícito: "me hace falta
// un search bar en los historiales, todos"; maqueta-facturar-buscadores.html,
// "me parece bien la lista"). Envuelve una lista que ya viene dibujada del
// servidor: cada registro lleva el atributo `data-buscar` (con texto extra
// opcional, por ejemplo el No. de factura) y se busca en ese texto más todo
// lo que el registro muestra. Sin tildes ni mayúsculas, y con varias
// palabras busca las que tengan todas ("t-24 juan").
//
// Las pantallas ahora traen todos los registros (antes, los últimos 200);
// aquí se muestran de a `porPagina`, con "Mostrar más".
function normalizar(t) {
  return (t || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function BuscadorLista({
  placeholder = "Buscar...",
  porPagina = 100,
  vacio = "Ningún registro coincide con esa búsqueda.",
  style,
  children,
}) {
  const ref = useRef(null);
  const [q, setQ] = useState("");
  const [visibles, setVisibles] = useState(porPagina);
  const [cuenta, setCuenta] = useState({ coinciden: 0, total: 0 });

  useEffect(() => {
    const raiz = ref.current;
    if (!raiz) return;
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    const items = Array.from(raiz.querySelectorAll("[data-buscar]"));
    let coinciden = 0;
    for (const el of items) {
      const texto = normalizar(`${el.getAttribute("data-buscar") || ""} ${el.textContent || ""}`);
      const ok = palabras.every((p) => texto.includes(p));
      if (ok) coinciden += 1;
      el.style.display = ok && coinciden <= visibles ? "" : "none";
    }
    // Sin resultados: se esconden también las tarjetas que agrupan registros
    // (para que no quede una tarjeta vacía); lo demás (pestañas, títulos) se
    // queda.
    const sinResultados = palabras.length > 0 && coinciden === 0 && items.length > 0;
    for (const hijo of Array.from(raiz.children)) {
      if (!hijo.matches("[data-buscar]") && hijo.querySelector("[data-buscar]")) {
        hijo.style.display = sinResultados ? "none" : "";
      }
    }
    // Solo si cambió (si no, cada render volvería a correr esto sin fin).
    setCuenta((prev) =>
      prev.coinciden === coinciden && prev.total === items.length ? prev : { coinciden, total: items.length }
    );
  }, [q, visibles, children]);

  return (
    <div style={style}>
      <div className="search-bar">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVisibles(porPagina);
          }}
          placeholder={placeholder}
        />
      </div>
      {q.trim() && cuenta.coinciden === 0 && cuenta.total > 0 && (
        <div className="card">
          <div className="empty">{vacio}</div>
        </div>
      )}
      <div ref={ref}>{children}</div>
      {cuenta.coinciden > visibles && (
        <button
          type="button"
          className="btn secondary"
          onClick={() => setVisibles((v) => v + porPagina)}
          style={{ marginTop: 12 }}
        >
          Mostrar más ({cuenta.coinciden - visibles} restantes)
        </button>
      )}
    </div>
  );
}
