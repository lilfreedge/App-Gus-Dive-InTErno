import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import HeaderSimple from "@/components/HeaderSimple";
import { cargarRecordatorios } from "@/lib/recordatorios";
import { tecnicosConCarga } from "@/lib/tecnicos";
import { hoyISO } from "@/lib/fechas";
import { quienEs, accesosDe, primerNombre } from "./datos";
import TecnicoInicio from "./tecnico-client";

// V38 -- Menú del técnico: "Lo que te toca" (ver datos.js).
// - Arriba, todo lo que le toca de las dos apps juntas: sus órdenes
//   asignadas (la más vieja primero) y los recordatorios de compresores que
//   le salen a él (vencidos y por vencer).
// - "Esperando al cliente": sus órdenes en Hold.
// - "También puedes": Compresores, Mantenimiento de regulador de la tienda y
//   "Listos hoy" (con "deshacer").
// - "Entrar al app completo" (y en ⚙) por si acaso.

const DIA_MS = 24 * 60 * 60 * 1000;

function ddmm(iso) {
  return iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "";
}

function textoRecordatorio(it) {
  const r = it.recordatorio;
  if (r.unidad === "horas") {
    const t = it.texto || "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (it.nunca && r.reinicia !== "hecho") return "Nunca se ha registrado: le toca ya";
  if (it.faltanDias < 0) return `Le tocaba el ${ddmm(it.proxima)}`;
  if (it.faltanDias === 0) return "Le toca hoy";
  if (it.faltanDias === 1) return "Le toca mañana";
  return `Le toca el ${ddmm(it.proxima)} (en ${it.faltanDias} días)`;
}

export default async function TecnicoPage({ searchParams }) {
  const supabase = createClient();
  const { yo, persona, viendoComo } = await quienEs(supabase, searchParams?.como);

  // El Titular o un administrador, sin escoger todavía a quién ver.
  if (!persona) {
    const tecnicos = await tecnicosConCarga(supabase);
    return (
      <div>
        <HeaderSimple nombre={primerNombre(yo.full_name)} sinBarra esTitular={!!yo.es_titular} />
        <div className="page tec" style={{ paddingTop: 16 }}>
          <Link href="/espacio?elegir=1" className="tec-volver">
            ← Volver
          </Link>
          <div className="tec-hola">Menú del técnico</div>
          <div className="tec-sub">Escoge a quién quieres ver. Te sale exactamente lo que le sale a esa persona.</div>
          {tecnicos.length === 0 ? (
            <div className="card">
              <div className="empty">No hay nadie con el rol Técnico.</div>
            </div>
          ) : (
            tecnicos.map((t) => (
              <Link key={t.id} href={`/tecnico?como=${t.id}`} className="tec-plegado" style={{ marginBottom: 10, textDecoration: "none" }}>
                <span>{t.full_name}</span>
                <span style={{ fontSize: 14, color: "var(--texto-suave)" }}>
                  {t.abiertas} orden{t.abiertas === 1 ? "" : "es"} ›
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  const accesos = accesosDe(persona);
  const hoy = hoyISO();

  const [ordenesRes, piezasRes, rec] = await Promise.all([
    accesos.ordenes
      ? supabase
          .from("ordenes_equipos")
          .select("*")
          .eq("tecnico_asignado_id", persona.id)
          .neq("estado", "Entregado")
          .order("fecha")
          .order("created_at")
      : Promise.resolve({ data: [] }),
    accesos.ordenes
      ? supabase.from("piezas_catalogo").select("id, nombre, codigo, tipos_equipo").eq("activo", true).order("nombre")
      : Promise.resolve({ data: [] }),
    accesos.compresores ? cargarRecordatorios(supabase, { usuarioId: persona.id, hoy }) : Promise.resolve({ items: [] }),
  ]);

  const ordenes = ordenesRes.data || [];

  // No. de serie de cada equipo (el técnico no ve el contacto del cliente:
  // de la orden solo va el nombre, que ya está en la orden misma).
  const idsEquipo = [...new Set(ordenes.map((o) => o.equipo_id).filter(Boolean))];
  const series = {};
  if (idsEquipo.length) {
    const { data: eqs } = await supabase.from("equipos_del_cliente").select("id, serie").in("id", idsEquipo);
    for (const e of eqs || []) series[e.id] = e.serie || null;
  }

  const recordatorios = (rec.items || [])
    .filter((it) => it.estado === "vencido" || it.estado === "pronto")
    .map((it) => ({
      key: `${it.recordatorio.id}-${it.compresor?.id || "x"}`,
      recordatorioId: it.recordatorio.id,
      compresorId: it.compresor?.id || null,
      titulo: it.compresor ? `${it.recordatorio.titulo} · Compresor ${it.compresor.codigo}` : it.recordatorio.titulo,
      texto: textoRecordatorio(it),
      estado: it.estado,
      reinicia: it.recordatorio.reinicia,
    }));

  const nombre = primerNombre(persona.full_name);

  return (
    <div>
      {/* Sin "Hola" arriba: ya sale grande debajo ("Hola, Dany"). */}
      <HeaderSimple
        nombre=""
        sinBarra
        esTitular={!!yo.es_titular}
        enlaces={[
          { href: "/app-clientes/perfil", texto: "Mi perfil" },
          { href: "/espacio?elegir=1", texto: "Entrar al app completo" },
        ]}
      />
      <div className="page tec" style={{ paddingTop: 12 }}>
        {viendoComo && (
          <div className="tec-banner">
            Estás viendo el menú de <b>{persona.full_name}</b>, tal como le sale a él. Lo que hagas aquí queda a tu nombre.{" "}
            <Link href="/tecnico" style={{ fontWeight: 700, color: "var(--azul-claro)" }}>
              Ver otro
            </Link>
          </div>
        )}
        <TecnicoInicio
          nombre={nombre}
          nombreQuienHace={yo.full_name || ""}
          ordenesIniciales={ordenes.map((o) => ({ ...o, serie: o.equipo_id ? series[o.equipo_id] || null : null }))}
          piezas={piezasRes.data || []}
          recordatorios={recordatorios}
          accesos={accesos}
          hoy={hoy}
          abrirId={searchParams?.abrir || null}
          como={viendoComo ? persona.id : null}
        />
      </div>
    </div>
  );
}
