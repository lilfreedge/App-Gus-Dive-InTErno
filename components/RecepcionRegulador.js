import { COMPONENTES_REGULADOR_DEFS, componentePresente, componenteDetalle, cambiosComponentes } from "@/lib/informe-mantenimiento";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";

// V100 ("44. a", "45. sí", "46. sí"): lo que se anotó al recibir el regulador
// (Registrar orden / Editar datos de la orden), en la ficha de la orden,
// debajo de "Servicio a realizar". Si no se anotó nada, no sale nada.
// `Campo` es el de la ficha (mismo tamaño que lo demás).
// "52. ambos": si hay una orden anterior del mismo equipo (`anterior`:
// { componentes, numero, fecha }), lo que cambió sale en naranja ("cambió",
// "la vez pasada no vino") o en rojo ("Sin X · la vez pasada sí").
export default function RecepcionRegulador({ orden, Campo, full = false, anterior = null }) {
  if (orden?.tipo_equipo !== "Reguladores") return null;
  const problemas = (orden.regulador_problemas_reportados || "").trim();
  const danos = (orden.regulador_danos_visibles || "").trim();
  const comps = orden.regulador_componentes || {};
  const cambios = anterior ? cambiosComponentes(comps, anterior.componentes) : null;
  const chips = [];
  for (const d of COMPONENTES_REGULADOR_DEFS) {
    const v = comps[d.id];
    const c = cambios?.porId[d.id];
    const detalle = componenteDetalle(v);
    const texto = detalle ? `${d.label} (${detalle})` : d.label;
    if (componentePresente(v)) {
      if (c?.tipo === "cambio") chips.push({ k: d.id, t: `${texto} · cambió`, cls: "cambio" });
      else if (c?.tipo === "nuevo") chips.push({ k: d.id, t: `${texto} · la vez pasada no vino`, cls: "cambio" });
      else chips.push({ k: d.id, t: texto });
    } else if (c?.tipo === "no_vino") {
      chips.push({ k: d.id, t: `Sin ${d.label.toLowerCase()} · la vez pasada sí`, cls: "no-vino" });
    } else if (v !== undefined && v !== null) {
      chips.push({ k: d.id, t: `Sin ${d.label.toLowerCase()}`, cls: "no-vino" });
    }
  }
  const antesTexto = cambios
    ? Object.entries(cambios.porId)
        .filter(([, c]) => c.tipo !== "nuevo")
        .map(([id, c]) => {
          const label = COMPONENTES_REGULADOR_DEFS.find((d) => d.id === id)?.label || id;
          return c.antes ? `${label} (${c.antes})` : label;
        })
    : [];
  return (
    <>
      {problemas && <Campo etiqueta="Problemas reportados por cliente" valor={problemas} full={full} />}
      {danos && <Campo etiqueta="Daños visibles" valor={danos} full={full} />}
      {chips.length > 0 && (
        <Campo etiqueta="Lo que trajo" full={full}>
          <div className="ord-trajo">
            {chips.map((c) => (
              <span key={c.k} className={c.cls}>
                {c.t}
              </span>
            ))}
          </div>
          {cambios && (
            <div className="ord-trajo-compara">
              Comparado con la orden {anterior.numero ? `${anterior.numero} ` : "anterior "}
              {anterior.fecha ? `(${formatFechaDDMMAAAADeDate(anterior.fecha)})` : ""}.
              {antesTexto.length > 0 && (
                <>
                  {" "}
                  <b>Antes:</b> {antesTexto.join(", ")}.
                </>
              )}
            </div>
          )}
        </Campo>
      )}
    </>
  );
}
