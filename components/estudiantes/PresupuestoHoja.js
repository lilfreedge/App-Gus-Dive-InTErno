"use client";

import { useState } from "react";
import { rd, fechaCursoCorta } from "@/lib/estudiantes/modelo";
import { presupuestosDe, presupuestoPara, totalHoja, totalSeccion, totalLinea, copiaHoja, HOJA_EJEMPLO, HOJA_VACIA, seccionConMontos } from "@/lib/estudiantes/presupuesto";
import { IconX, IconPlus } from "@/components/icons";

// V98 (maqueta V99: "29. A por ahora", "30. sí"): presupuestos predeterminados
// por cantidad de estudiantes, el pedido de un toque y el registro de lo pedido.

const numero = (v) => String(v ?? "").replace(/[^\d.]/g, "");

// La hoja editable: secciones con líneas (concepto, precio, cantidad, total) o
// líneas de solo texto (como las yolas del sábado y el domingo).
export function HojaEditor({ hoja, onChange }) {
  const h = hoja || { secciones: [] };
  const cambiar = (fn) => {
    const c = copiaHoja(h);
    fn(c);
    onChange(c);
  };
  return (
    <div className="ce-ph">
      {h.secciones.map((s, si) => (
        <div key={si} className="ce-ph-sec">
          <div className="ce-ph-sec-t">
            <input value={s.t} placeholder="Nombre de la sección (ej. La Caleta 1)" onChange={(e) => cambiar((c) => (c.secciones[si].t = e.target.value))} />
            <button type="button" className="ce-ph-x" title="Quitar sección" aria-label="Quitar sección" onClick={() => cambiar((c) => c.secciones.splice(si, 1))}>
              <IconX size={15} />
            </button>
          </div>
          <div className="ce-ph-tabla">
            {s.lineas.some((l) => !l.info) && (
              <div className="ce-ph-fila ce-ph-cab">
                <span>Concepto</span>
                <span>Precio</span>
                <span>Cant.</span>
                <span>Total</span>
                <span />
              </div>
            )}
            {s.lineas.map((l, li) =>
              l.info ? (
                <div key={li} className="ce-ph-fila ce-ph-info">
                  <input value={l.t} placeholder="Texto (ej. Sábado: 2 yolas, capacidad 8)" onChange={(e) => cambiar((c) => (c.secciones[si].lineas[li].t = e.target.value))} />
                  <button type="button" className="ce-ph-x" aria-label="Quitar" onClick={() => cambiar((c) => c.secciones[si].lineas.splice(li, 1))}>
                    <IconX size={14} />
                  </button>
                </div>
              ) : (
                <div key={li} className="ce-ph-fila">
                  <input value={l.t} placeholder="Concepto" onChange={(e) => cambiar((c) => (c.secciones[si].lineas[li].t = e.target.value))} />
                  <input inputMode="decimal" value={l.precio} onChange={(e) => cambiar((c) => (c.secciones[si].lineas[li].precio = numero(e.target.value)))} />
                  <input inputMode="decimal" value={l.cant} onChange={(e) => cambiar((c) => (c.secciones[si].lineas[li].cant = numero(e.target.value)))} />
                  <b>{rd(totalLinea(l))}</b>
                  <button type="button" className="ce-ph-x" aria-label="Quitar" onClick={() => cambiar((c) => c.secciones[si].lineas.splice(li, 1))}>
                    <IconX size={14} />
                  </button>
                </div>
              )
            )}
          </div>
          <div className="ce-ph-pie">
            <span>
              <button type="button" className="ce-ph-mas" onClick={() => cambiar((c) => c.secciones[si].lineas.push({ t: "", precio: 0, cant: 1 }))}>
                + Línea
              </button>
              <button type="button" className="ce-ph-mas" onClick={() => cambiar((c) => c.secciones[si].lineas.push({ t: "", info: true }))}>
                + Texto
              </button>
            </span>
            {seccionConMontos(s) && <b>Total {s.t || "sección"}: {rd(totalSeccion(s))}</b>}
          </div>
        </div>
      ))}
      <button type="button" className="btn secondary vj-mini" onClick={() => cambiar((c) => c.secciones.push({ t: "", lineas: [{ t: "", precio: 0, cant: 1 }] }))}>
        <IconPlus size={15} /> Sección
      </button>
      <div className="ce-ph-total">
        <span>Presupuesto total</span>
        <b>{rd(totalHoja(h))}</b>
      </div>
    </div>
  );
}

// La hoja para ver (lo que se pidió).
export function HojaVer({ hoja }) {
  return (
    <div className="ce-ph ce-ph-ver">
      {(hoja?.secciones || []).map((s, si) => (
        <div key={si} className="ce-ph-sec">
          <div className="ce-ph-sec-n">{s.t || "Sin nombre"}</div>
          {s.lineas.filter((l) => l.info).map((l, i) => (
            <div key={`i${i}`} className="hint-text" style={{ margin: "0 0 2px" }}>
              {l.t}
            </div>
          ))}
          {seccionConMontos(s) && (
            <table className="ce-ph-t">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Precio</th>
                  <th>Cant.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {s.lineas.filter((l) => !l.info).map((l, i) => (
                  <tr key={i}>
                    <td>{l.t}</td>
                    <td>{rd(l.precio)}</td>
                    <td>{l.cant}</td>
                    <td>{rd(totalLinea(l))}</td>
                  </tr>
                ))}
                <tr className="tot">
                  <td colSpan={3}>Total {s.t}</td>
                  <td>{rd(totalSeccion(s))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ))}
      <div className="ce-ph-total">
        <span>Presupuesto total</span>
        <b>{rd(totalHoja(hoja))}</b>
      </div>
    </div>
  );
}

// Catálogo de cursos › Editar curso › "Presupuestos predeterminados".
export function PresupuestosCurso({ info, setInfo }) {
  const lista = presupuestosDe({ info });
  const [sel, setSel] = useState(lista.length ? lista[0][0] : null);
  const [nuevoN, setNuevoN] = useState("");
  const guardarTodos = (obj) => setInfo({ ...(info || {}), presupuestos: obj });
  const actuales = () => Object.fromEntries(lista.map(([n, h]) => [String(n), h]));
  function agregar(n, base) {
    if (!Number.isInteger(n) || n < 1 || n > 60) return;
    const obj = actuales();
    if (!obj[String(n)]) {
      const cerca = presupuestoPara({ info }, n);
      obj[String(n)] = copiaHoja(base || cerca?.hoja || HOJA_VACIA);
      guardarTodos(obj);
    }
    setSel(n);
    setNuevoN("");
  }
  const ultimo = lista.length ? lista[lista.length - 1][0] : 0;
  const hoja = sel != null ? lista.find(([n]) => n === sel)?.[1] : null;
  return (
    <div className="ce-ph-curso">
      <div className="hint-text" style={{ margin: "0 0 6px" }}>
        Presupuestos predeterminados (lo que se le pide a Dinorah según cuántos estudiantes). Al pedir el presupuesto de una fecha, sale el de los inscritos.
      </div>
      {lista.length > 0 ? (
        <div className="ce-ph-lista">
          {lista.map(([n, h]) => (
            <button type="button" key={n} className={`ce-ph-pre${n === sel ? " sel" : ""}`} onClick={() => setSel(n)}>
              <span>
                {n} estudiante{n === 1 ? "" : "s"}
              </span>
              <b>{rd(totalHoja(h))}</b>
            </button>
          ))}
        </div>
      ) : (
        <div className="ce-ph-vacio">
          <span>Este curso no tiene presupuestos todavía.</span>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn secondary vj-mini" onClick={() => agregar(4, HOJA_EJEMPLO)}>
              Empezar con la hoja de Open Water (4 estudiantes)
            </button>
            <button type="button" className="btn secondary vj-mini" onClick={() => agregar(1, HOJA_VACIA)}>
              Empezar vacío (1 estudiante)
            </button>
          </span>
        </div>
      )}
      {lista.length > 0 && (
        <div className="ce-ph-agregar">
          <button type="button" className="btn secondary vj-mini" onClick={() => agregar(ultimo + 1)}>
            + Agregar para {ultimo + 1} estudiantes (copia el de {ultimo})
          </button>
          <span>
            o para
            <input inputMode="numeric" value={nuevoN} onChange={(e) => setNuevoN(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="N" />
            <button type="button" className="btn secondary vj-mini" disabled={!nuevoN} onClick={() => agregar(Number(nuevoN))}>
              Agregar
            </button>
          </span>
        </div>
      )}
      {hoja && (
        <div className="ce-ph-editor">
          <div className="ce-ph-editor-t">
            <b>
              Presupuesto para {sel} estudiante{sel === 1 ? "" : "s"}
            </b>
            <button
              type="button"
              className="ce-ph-quitar"
              onClick={() => {
                const obj = actuales();
                delete obj[String(sel)];
                guardarTodos(obj);
                const resto = lista.filter(([n]) => n !== sel);
                setSel(resto.length ? resto[0][0] : null);
              }}
            >
              Quitar este presupuesto
            </button>
          </div>
          <HojaEditor
            hoja={hoja}
            onChange={(h) => {
              const obj = actuales();
              obj[String(sel)] = h;
              guardarTodos(obj);
            }}
          />
          <div className="hint-text">Los cambios quedan al darle Guardar al curso.</div>
        </div>
      )}
    </div>
  );
}

// Página del curso › Presupuesto: sale el predeterminado de los inscritos, con
// el total grande; un toque y se manda. El detalle se puede cambiar solo para esta vez.
export function PedirPresupuesto({ f, c, inscritos, otro, ops, alCerrar }) {
  const pre = presupuestoPara(c, inscritos);
  const ultimoPedido = (f.presupuestoDetalle || [])[(f.presupuestoDetalle || []).length - 1];
  const [hoja, setHoja] = useState(() => copiaHoja(pre?.hoja || ultimoPedido?.hoja || null));
  const [abierto, setAbierto] = useState(!pre && !ultimoPedido);
  const [mandando, setMandando] = useState(false);
  const conMontos = hoja && hoja.secciones?.length > 0;
  async function mandar(sinMontos) {
    setMandando(true);
    const ok = await ops.pedirPresupuesto(f.id, otro, sinMontos || !conMontos ? null : { estudiantes: inscritos, hoja });
    setMandando(false);
    if (ok !== false) alCerrar();
  }
  return (
    <div className="ce-gp-panel ce-ph-pedir">
      <div className="hint-text" style={{ margin: 0 }}>
        {/* V110 (pedido explícito): sin "· el predeterminado". */}
        Presupuesto para <b>{inscritos} estudiante{inscritos === 1 ? "" : "s"}</b>
      </div>
      {pre && !pre.exacto && (
        <div className="ce-ph-aviso">
          No tienes uno para {inscritos} estudiante{inscritos === 1 ? "" : "s"}. Te puse el de {pre.n}: cámbialo abajo si hace falta. Los agregas en Más › Catálogo de cursos › {c?.nombre} › Presupuestos.
        </div>
      )}
      {!pre && (
        <div className="ce-ph-aviso">
          {c?.nombre} no tiene presupuestos predeterminados. Agrégalos en Más › Catálogo de cursos › {c?.nombre} › Presupuestos.{ultimoPedido ? " Te puse el último que se pidió." : " Mientras, puedes llenarlo aquí o mandar solo la lista de inscritos."}
        </div>
      )}
      {conMontos && <div className="ce-ph-grande">{rd(totalHoja(hoja))}</div>}
      <button type="button" className="ce-ph-link" onClick={() => setAbierto(!abierto)}>
        {abierto ? "Esconder el detalle" : "Ver el detalle"}
      </button>
      {abierto && <HojaEditor hoja={hoja || copiaHoja(HOJA_VACIA)} onChange={setHoja} />}
      {otro && <div className="hint-text">Se manda otra vez el correo a Dinorah. Se vuelven a marcar como pendientes "realizado" y "entregado".</div>}
      <div className="ce-gp-pie">
        <button type="button" className="btn ce-gp-boton" disabled={mandando} onClick={() => mandar(false)}>
          {mandando ? "Enviando…" : "Enviar solicitud"}
        </button>
        <button type="button" className="btn secondary" onClick={alCerrar}>
          Cancelar
        </button>
        {!pre && (
          <button type="button" className="ce-ph-link" disabled={mandando} onClick={() => mandar(true)}>
            Mandar solo la lista, sin montos
          </button>
        )}
      </div>
    </div>
  );
}

// Lo que se pidió, guardado en la fecha ("por si acaso queremos verificar el detalle").
// V111 (maqueta V112, "169. A"): el último pedido, compacto: el total grande con
// "Ver detalle" y debajo quién, cuántos estudiantes y `extra` (las gorras). Los
// de antes (de cuando existía "Pedir otro presupuesto") siguen como líneas chicas.
export function PedidosGuardados({ f, extra = "" }) {
  const lista = f.presupuestoDetalle || [];
  const [ver, setVer] = useState(null);
  if (!lista.length) return null;
  const ult = lista[lista.length - 1];
  const iu = lista.length - 1;
  return (
    <div className="ce-ph-pedidos">
      <div className="ce-ph-ult">
        <span className="ce-ph-ult-total">{rd(ult.total)}</span>
        <button type="button" className="ce-ph-link" onClick={() => setVer(ver === iu ? null : iu)}>
          {ver === iu ? "Esconder" : "Ver detalle"}
        </button>
      </div>
      <div className="ce-ph-ult-meta">
        {[ult.por, `${ult.estudiantes} estudiante${ult.estudiantes === 1 ? "" : "s"}`, extra].filter(Boolean).join(" · ")}
      </div>
      {ver === iu && <HojaVer hoja={ult.hoja} />}
      {[...lista].slice(0, -1).reverse().map((x, i) => {
        const idx = lista.length - 2 - i;
        return (
          <div key={idx}>
            <div className="ce-ph-pedido">
              <span>
                Antes el {fechaCursoCorta(String(x.en).slice(0, 10))}
                {x.por ? ` · ${x.por}` : ""} · {x.estudiantes} estudiante{x.estudiantes === 1 ? "" : "s"}
              </span>
              <span>
                <b>{rd(x.total)}</b>
                <button type="button" className="ce-ph-link" onClick={() => setVer(ver === idx ? null : idx)}>
                  {ver === idx ? "Esconder" : "Ver detalle"}
                </button>
              </span>
            </div>
            {ver === idx && <HojaVer hoja={x.hoja} />}
          </div>
        );
      })}
    </div>
  );
}
