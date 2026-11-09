"use client";

import { useEffect, useState } from "react";

// V61 ("202. A", maqueta V60): la fecha de nacimiento con tres listas (día,
// mes y año) en vez del calendario, que obligaba a ir mes por mes hasta el
// año en que nació. value / onChange en formato "AAAA-MM-DD" ("" si falta algo).
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export default function FechaNacimiento({ value, onChange, className = "", selectClassName = "", futuro = false }) {
  const partes = /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value.split("-") : ["", "", ""];
  const [a, setA] = useState(partes[0]);
  const [m, setM] = useState(partes[1]);
  const [d, setD] = useState(partes[2]);
  // Si el valor cambia desde afuera (por ejemplo al cargar los datos), se refleja.
  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
      const [va, vm, vd] = value.split("-");
      setA(va);
      setM(vm);
      setD(vd);
    }
  }, [value]);
  const anioActual = new Date().getFullYear();
  const anios = [];
  // V62 ("245"): con futuro, los años que vienen (para "Escribirle de nuevo el").
  if (futuro) for (let y = anioActual; y <= anioActual + 2; y++) anios.push(String(y));
  else for (let y = anioActual; y >= anioActual - 100; y--) anios.push(String(y));
  const diasMes = a && m ? new Date(Number(a), Number(m), 0).getDate() : 31;
  const cambiar = (na, nm, nd) => {
    setA(na);
    setM(nm);
    setD(nd);
    const dd = nd && na && nm && Number(nd) > new Date(Number(na), Number(nm), 0).getDate() ? "" : nd;
    if (dd !== nd) setD(dd);
    onChange(na && nm && dd ? `${na}-${nm}-${dd}` : "");
  };
  return (
    <div className={`fecha-nac ${className}`}>
      <select className={selectClassName} aria-label="Día" value={d} onChange={(e) => cambiar(a, m, e.target.value)}>
        <option value="">Día</option>
        {Array.from({ length: diasMes }, (_, i) => String(i + 1).padStart(2, "0")).map((x) => (
          <option key={x} value={x}>
            {Number(x)}
          </option>
        ))}
      </select>
      <select className={selectClassName} aria-label="Mes" value={m} onChange={(e) => cambiar(a, e.target.value, d)}>
        <option value="">Mes</option>
        {MESES.map((t, i) => (
          <option key={t} value={String(i + 1).padStart(2, "0")}>
            {t}
          </option>
        ))}
      </select>
      <select className={selectClassName} aria-label="Año" value={a} onChange={(e) => cambiar(e.target.value, m, d)}>
        <option value="">Año</option>
        {anios.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
