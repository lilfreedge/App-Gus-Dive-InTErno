import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HeaderSimple from "@/components/HeaderSimple";
import { cargarRecordatorios } from "@/lib/recordatorios";
import { formatHoras, indiceAceite } from "@/lib/compresores";
import { hoyISO } from "@/lib/fechas";
import { quienEs, accesosDe, primerNombre, sufijoComo } from "../datos";
import { IComp, ILlave } from "../iconos";

// V38 -- Compresores en el menú del técnico (pedido explícito: "lo mismo
// para la ventana de compresores en el app interno... hacerlo sencillo";
// maqueta-v38-3.html, A5): una tarjeta por compresor con lo que le toca
// (según los recordatorios), el horómetro, cómo estaba el aceite la última
// vez y el último registro, y un botón grande para registrar.

function ddmm(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "";
}

function textoItem(it) {
  const r = it.recordatorio;
  if (r.unidad === "horas") return `${r.titulo}: ${it.texto}`;
  if (it.nunca && r.reinicia !== "hecho") return `${r.titulo}: nunca se ha registrado`;
  if (it.faltanDias < 0) return `${r.titulo}: le tocaba el ${ddmm(it.proxima)}`;
  if (it.faltanDias === 0) return `${r.titulo}: le toca hoy`;
  if (it.faltanDias === 1) return `${r.titulo}: le toca mañana`;
  return `${r.titulo}: en ${it.faltanDias} días`;
}

const COLOR = { vencido: "rojo", pronto: "ambar", ok: "verde", sin_datos: "ambar" };
const COLOR_ACEITE = ["#2c9e5b", "#2c9e5b", "#d98a1c", "#d64545"];

export default async function TecnicoCompresoresPage({ searchParams }) {
  const supabase = createClient();
  const { yo, persona, viendoComo } = await quienEs(supabase, searchParams?.como);
  if (!persona) redirect("/tecnico");
  const accesos = accesosDe(persona);
  if (!accesos.compresores) redirect(`/tecnico${sufijoComo(viendoComo, persona)}`);
  const hoy = hoyISO();
  const sufijo = sufijoComo(viendoComo, persona);

  const [{ data: compresores }, { items }, { data: mants }] = await Promise.all([
    supabase.from("compresores").select("id, codigo, descripcion, marca, modelo, activo").eq("activo", true).order("codigo"),
    cargarRecordatorios(supabase, { hoy }),
    supabase
      .from("mantenimientos_compresores_con_nombre")
      .select("compresor_id, fecha, horometro, nivel_aceite, responsable, full_name, created_at")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3000),
  ]);

  const datos = {};
  for (const m of mants || []) {
    const d = (datos[m.compresor_id] ||= { ultimo: null, horometro: null, aceite: null });
    if (!d.ultimo) d.ultimo = m;
    const h = Number(m.horometro);
    if (!Number.isNaN(h) && (d.horometro === null || h > d.horometro)) d.horometro = h;
    if (!d.aceite && m.nivel_aceite) d.aceite = m.nivel_aceite;
  }

  return (
    <div>
      <HeaderSimple
        nombre={primerNombre(yo.full_name)}
        sinBarra
        esTitular={!!yo.es_titular}
        enlaces={[
          { href: "/app-clientes/perfil", texto: "Mi perfil" },
          { href: "/espacio?elegir=1", texto: "Entrar al app completo" },
        ]}
      />
      <div className="page tec" style={{ paddingTop: 12 }}>
        <Link href={`/tecnico${sufijo}`} className="tec-volver">
          ← Volver
        </Link>
        <div className="tec-hola" style={{ marginBottom: 12 }}>
          Compresores
        </div>

        {(compresores || []).length === 0 && (
          <div className="card">
            <div className="empty">No hay compresores registrados.</div>
          </div>
        )}

        {(compresores || []).map((c) => {
          const delC = (items || []).filter((it) => it.compresor?.id === c.id);
          const peor = delC[0] || null; // vienen ordenados: vencido, pronto, ok
          const color = peor ? COLOR[peor.estado] || "verde" : "verde";
          const d = datos[c.id] || {};
          const iAceite = indiceAceite(d.aceite);
          const desc = c.descripcion || [c.marca, c.modelo].filter(Boolean).join(" ");
          return (
            <div key={c.id} className={`tec-card ${color}`}>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className={`tec-icono ${color}`}>
                    <IComp />
                  </span>
                  <div className="tec-card-main">
                    <div className="tec-titulo">Compresor {c.codigo}</div>
                    {desc && <div className="tec-linea gris">{desc}</div>}
                  </div>
                </div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                  {delC.length === 0 ? (
                    <span className="tec-estado verde">Sin recordatorios</span>
                  ) : (
                    delC
                      .filter((it, i) => i === 0 || it.estado !== "ok")
                      .map((it) => (
                        <span key={it.recordatorio.id} className={`tec-estado ${COLOR[it.estado] || "verde"}`}>
                          {textoItem(it)}
                        </span>
                      ))
                  )}
                </div>
                <div style={{ marginTop: 8 }}>
                  <div className="tec-dato">
                    <span>Horómetro</span>
                    <b>{d.horometro !== null && d.horometro !== undefined ? `${formatHoras(d.horometro)} h` : "—"}</b>
                  </div>
                  <div className="tec-dato">
                    <span>Aceite (última vez)</span>
                    <b>
                      {d.aceite ? (
                        <>
                          {iAceite !== null && (
                            <span className="tec-dot" style={{ background: COLOR_ACEITE[iAceite], marginRight: 6, verticalAlign: 0 }} />
                          )}
                          {d.aceite}
                        </>
                      ) : (
                        "—"
                      )}
                    </b>
                  </div>
                  <div className="tec-dato">
                    <span>Último registro</span>
                    <b>
                      {d.ultimo
                        ? `${ddmm(d.ultimo.fecha)} · ${d.ultimo.responsable || primerNombre(d.ultimo.full_name) || "—"}`
                        : "Ninguno todavía"}
                    </b>
                  </div>
                </div>
                {accesos.registrarCompresor && (
                  <Link
                    href={`/tecnico/compresores/${c.id}${sufijo}`}
                    className="tec-btn azul"
                    style={{ marginTop: 10 }}
                  >
                    <ILlave /> Registrar mantenimiento
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
