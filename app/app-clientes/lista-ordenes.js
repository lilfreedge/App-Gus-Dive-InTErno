import Link from "next/link";
import { formatFechaDDMMAAAADeDate } from "@/lib/format";
import { tipoEquipoLabel } from "@/lib/tipo-equipo";

const BADGE_ESTADO = {
  "En proceso": "badge-amarillo",
};

// V82: la lista de órdenes del Inicio de App Equipos de clientes, sacada
// de page.js a su propio archivo (mismo código) para poder revisarla en
// el celular con datos de prueba.
// Badge de estado reposicionado al medio de la fila (pedido explícito,
// 23-sep-2026: "poner el 'en proceso' en medio del boton, en vez de ahi
// al final. al igual que cualquier otra nota que pueda aparecer") --
// acotado a este hub, Registro e Historial ya tenían el badge separado
// de la fecha en su propio diseño. `fechaCampo`/`fechaLabel` deciden
// qué fecha real mostrar y cómo se llama, según la sección (item 12).
// `mostrarDiasAfuera` (item 13, pedido explícito, 26-sep-2026) agrega un
// aviso de cuántos días lleva afuera, para las que están en reparación.
// `avisoAtrasadaDias` (item 25, pedido explícito, 26-sep-2026: "aqui en
// cada orden que este pendiente por trabajar y tenga mas de 5 dias en ese
// estado, que salga una notificacion tipo 'esta orden esta atrasada'")
// agrega un aviso rojo cuando la orden lleva más de N días desde
// `fechaCampo` sin que haya pasado a otro estado. El No. de orden (item
// 10, pedido explícito) se agregó como `folio-tag` al inicio del título --
// mismo patrón que ya usan Registro de Órdenes e Historial (folio-tag),
// antes solo se veía cliente + equipo aquí.
export default function ListaOrdenes({
  ordenes,
  // V39: { [id del técnico]: nombre } para la línea "Técnico: ..." (sutil).
  nombresTecnicos = {},
  vacio,
  fechaCampo = "fecha",
  fechaLabel = "Fecha",
  mostrarDiasAfuera = false,
  diasAfueraMinimo = null,
  avisoAtrasadaDias = null,
  // Feature Hold (27-sep-2026): `diasDesdeCampo` permite contar los días
  // desde OTRO campo del row (ej. el inicio del Hold activo) en vez del
  // `fechaCampo` que se muestra a la derecha -- por defecto usa el mismo
  // fechaCampo, así que las demás secciones no cambian de comportamiento.
  // `avisoHoldDias` (pedido explícito: "si, 3 dias") agrega un aviso rojo
  // aparte cuando ya lleva más de ese umbral. `mostrarMotivoEspera` muestra
  // el resumen del Hold activo (motivo_espera, ya se deriva solo).
  diasDesdeCampo = null,
  avisoHoldDias = null,
  mostrarMotivoEspera = false,
  // "Pendiente verificar para despachar" (28-sep-2026, pedido explícito,
  // ver comentario sobre porEntregarConVerificacion más arriba) -- solo
  // lo pasa la sección de "Pendientes por entregar", y solo si quien
  // mira Inicio puede verificar (Titular/Administrador).
  mostrarSinVerificar = false,
}) {
  return (
    <div className="card">
      {!ordenes || ordenes.length === 0 ? (
        <div className="empty">{vacio}</div>
      ) : (
        ordenes.map((o) => {
          const fechaValor = o[fechaCampo];
          // V76 (pedido explícito, con foto: "que los dias que diga que
          // sean en base a desde que llego desde la prueba hidrostatica,
          // no desde la fecha que llego el equipo a tienda") -- si la
          // orden tiene valor en `diasDesdeCampo`, los días se cuentan
          // desde ahí; si no (la mayoría, que no tiene ese campo), se
          // sigue contando desde `fechaCampo` como siempre.
          const valorParaDias = (diasDesdeCampo && o[diasDesdeCampo]) || o[fechaCampo];
          const diasTranscurridos = valorParaDias
            ? Math.floor((Date.now() - new Date(valorParaDias).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          // `diasAfueraMinimo` (item 7, pedido explícito, 27-sep-2026: "a
          // cada tanque que tenga mas de 15 dias fuera, ponle la cantidad
          // de dias que tiene fuera a cada uno") -- a diferencia de
          // Reparación (siempre lo muestra), en Prueba hidrostática solo
          // se quiere el aviso a partir de cierto umbral.
          const diasAfuera =
            mostrarDiasAfuera && (diasAfueraMinimo === null || (diasTranscurridos !== null && diasTranscurridos > diasAfueraMinimo))
              ? diasTranscurridos
              : null;
          const atrasada = avisoAtrasadaDias !== null && diasTranscurridos !== null && diasTranscurridos > avisoAtrasadaDias;
          const enHoldHaceDias =
            avisoHoldDias !== null && diasTranscurridos !== null && diasTranscurridos > avisoHoldDias ? diasTranscurridos : null;
          return (
            <Link
              key={o.id}
              href={`/app-clientes/ordenes/${o.id}`}
              className="list-item"
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              {/* V82 (pedido explícito, con foto del celular: "se ve apretado,
                  algunos nombres no se leen bien") -- en la computadora queda
                  igual (nombre, notas en medio, fecha); en el celular el nombre
                  y la fecha van arriba y las notas bajan a su propia línea
                  (ver .orden-fila en globals.css). */}
              <div className="list-item-top orden-fila">
                <span className="list-item-title orden-fila-titulo">
                  <span className="folio-tag">No. {o.no_orden_fisico ?? o.folio}</span>
                  {o.cliente_nombre_snapshot} — {tipoEquipoLabel(o.tipo_equipo, o.tipo_equipo_otro)}
                </span>
                <span className="orden-fila-notas">
                  {mostrarSinVerificar && o.necesita_verificar ? (
                    <span className="badge badge-rojo">Pendiente verificar para despachar</span>
                  ) : (
                    BADGE_ESTADO[o.estado] && <span className={`badge ${BADGE_ESTADO[o.estado]}`}>{o.estado}</span>
                  )}
                  {o.en_espera && <span className="badge badge-rojo">En Hold</span>}
                  {o.hold_respondido && !o.en_espera && <span className="badge badge-azul">Hold respondido</span>}
                  {/* V76 (pedido explícito, con foto): llama la atención al
                      lado de "En proceso" cuando ya volvió de la prueba
                      hidrostática pero todavía falta la inspección visual. */}
                  {o.falta_inspeccion && <span className="badge badge-rojo">Le hace falta inspección visual</span>}
                  {o.falta_llenado && <span className="badge badge-azul">Le hace falta llenado</span>}
                </span>
                <span className="list-item-qty orden-fila-fecha">
                  {/* V57: el nombre de la fecha sale una sola vez, arriba al lado del título
                      ("que no se vea tantas veces repetidas"). */}
                  <div>{fechaValor ? formatFechaDDMMAAAADeDate(fechaValor) : "—"}</div>
                </span>
              </div>
              {/* V39: el técnico asignado, en gris. Sin técnico, no dice nada. */}
              {o.tecnico_asignado_id && nombresTecnicos[o.tecnico_asignado_id] && (
                <div className="hint-text" style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
                  </svg>
                  Técnico: {nombresTecnicos[o.tecnico_asignado_id]}
                </div>
              )}
              {diasAfuera !== null && (
                <div className="hint-text" style={{ marginTop: 4, color: "var(--rojo)", fontWeight: 600 }}>
                  Lleva {diasAfuera} día{diasAfuera === 1 ? "" : "s"} afuera
                </div>
              )}
              {atrasada && (
                <div className="hint-text" style={{ marginTop: 4, color: "var(--rojo)", fontWeight: 600 }}>
                  Atrasada — lleva {diasTranscurridos} día{diasTranscurridos === 1 ? "" : "s"} en tienda
                </div>
              )}
              {enHoldHaceDias !== null && (
                <div className="hint-text" style={{ marginTop: 4, color: "var(--rojo)", fontWeight: 600 }}>
                  En Hold hace {enHoldHaceDias} día{enHoldHaceDias === 1 ? "" : "s"} — contactar al cliente
                </div>
              )}
              {mostrarMotivoEspera && o.motivo_espera && (
                <div className="hint-text" style={{ marginTop: 4 }}>{o.motivo_espera}</div>
              )}
            </Link>
          );
        })
      )}
    </div>
  );
}
