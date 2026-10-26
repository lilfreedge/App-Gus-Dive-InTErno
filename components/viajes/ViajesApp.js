"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconGear, IconLogout, IconLock, IconShuffle, IconHistory } from "@/components/icons";
import { cargarTodo, viajeAFila, insAFila, buzoAFila, catalogoAFila, nuevoId } from "@/lib/viajes/datos";
import { ahora, hoyISO, rd } from "@/lib/viajes/modelo";
import { Inicio, Calendario } from "./Inicio";
import { Viaje } from "./Viaje";
import { NuevoViaje, Catalogo, EditarPlantilla } from "./Catalogo";
import { Buzos, FichaBuzo } from "./Buzos";
import { Historial, Reporte } from "./Historial";
import { Estadisticas } from "./Estadisticas";
import { AccesosViajes } from "./Accesos";

// V42 -- App Viajes/Buceos. Un solo componente para todas las pantallas
// (/viajes-buceos/...): los datos se cargan una vez y se quedan mientras
// uno se mueve dentro del app. Cada cambio se guarda en Supabase y queda en
// la bitácora (quién, cuándo, antes -> después).

const BASE = "/viajes-buceos";

export function rutaDeUrl(path) {
  const p = (path || "").replace(/^\/viajes-buceos\/?/, "").split("/").filter(Boolean);
  if (!p.length) return "inicio";
  if (p[0] === "viaje" && p[1]) return p[2] === "reporte" ? `reporte:${p[1]}` : `viaje:${p[1]}${p[2] ? `:${p[2]}` : ""}`;
  if (p[0] === "buzos" && p[1]) return `buzo:${p[1]}`;
  if (p[0] === "catalogo" && p[1]) return `plantilla:${p[1]}`;
  return p[0];
}
export function urlDeRuta(r) {
  const [k, id, tab] = r.split(":");
  if (k === "inicio") return BASE;
  if (k === "viaje") return `${BASE}/viaje/${id}${tab ? `/${tab}` : ""}`;
  if (k === "reporte") return `${BASE}/viaje/${id}/reporte`;
  if (k === "buzo") return `${BASE}/buzos/${id}`;
  if (k === "plantilla") return `${BASE}/catalogo/${id}`;
  return `${BASE}/${k}`;
}

function Topbar({ nombre, nombreCompleto, correo, esTitular, links, activo, ir, verChangelog }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  async function salir() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="topbar vj-topbar">
      <div className="topbar-inner">
        <div>
          <a className="topbar-logo-link" href={BASE} onClick={(e) => (e.preventDefault(), ir("inicio"))} aria-label="Ir al inicio">
            <Image src="/logo-gus-icon.png" alt="Gus Dive" width={64} height={22} className="topbar-logo" priority />
          </a>
          <div className="topbar-sub">Hola, {nombre}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div className="gear-wrap" ref={menuRef}>
            <button className="gear-btn" onClick={() => setOpen((o) => !o)} aria-label="Ajustes">
              <IconGear size={18} />
            </button>
            {open && (
              <div className="settings-menu">
                <div className="settings-menu-who">
                  <b>{nombreCompleto}</b>
                  {correo}
                </div>
                {esTitular && (
                  <a className="settings-menu-link" onClick={() => (setOpen(false), ir("accesos"))} style={{ cursor: "pointer" }}>
                    <IconLock size={15} /> Accesos de Viajes
                  </a>
                )}
                {verChangelog && (
                  <Link href="/changelog?desde=viajes" className="settings-menu-link" onClick={() => setOpen(false)}>
                    <IconHistory size={15} /> Changelog
                  </Link>
                )}
                <hr />
                <Link href="/espacio?elegir=1" className="settings-menu-link" onClick={() => setOpen(false)}>
                  <IconShuffle size={15} /> Cambiar de app
                </Link>
                <button className="settings-menu-link settings-menu-danger" onClick={salir}>
                  <IconLogout size={15} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="topbar-appname">VIAJES/BUCEOS</div>
      <nav className="topnav">
        {links.map((l) => (
          <a
            key={l.r}
            href={urlDeRuta(l.r)}
            className={`topnav-link${activo === l.r ? " topnav-link-active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              ir(l.r);
            }}
          >
            {l.t}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function ViajesApp({ p, yo, personas, calUrl, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [db, setDb] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const ruta = rutaDeUrl(pathname);
  const rol = { corto: yo.corto };

  const recargar = useCallback(async () => {
    try {
      setDb(await cargarTodo(supabase, { conBitacora: p.bitacora }));
      setError("");
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [supabase, p.bitacora]);
  useEffect(() => {
    recargar();
  }, [recargar]);

  const ir = (r) => {
    router.push(urlDeRuta(r));
    window.scrollTo(0, 0);
  };
  const avisar = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2600);
  };

  // ------------------------------------------------------------ guardar
  const log = async (viajeId, texto, antes, despues) => {
    const fila = { id: nuevoId(), viaje_id: viajeId || null, quien_id: yo.id, quien: yo.corto, texto, antes: antes ?? null, despues: despues ?? null };
    setDb((d) => ({ ...d, bitacora: [{ id: fila.id, viajeId: fila.viaje_id, cuando: ahora(), quien: fila.quien, texto, antes, despues }, ...d.bitacora] }));
    await supabase.from("viajes_bitacora").insert(fila);
  };
  const guardar = async (promesa) => {
    const { error: e } = await promesa;
    if (e) throw e;
  };
  const fallo = (e) => {
    const m = String(e?.message || e);
    avisar(
      /documento_uq/.test(m)
        ? "Esa cédula ya está en la base, con otra persona."
        : /pasaporte_uq/.test(m)
        ? "Ese pasaporte ya está en la base, con otra persona."
        : /viaje_id_buzo_id/.test(m)
        ? "Esa persona ya está en este viaje."
        : `No se pudo guardar: ${m}`
    );
    recargar();
  };
  const local = (fn) => setDb((d) => fn(d));

  const ops = {
    async cambiarViaje(v, cambios, texto, antes, despues) {
      const nuevo = { ...v, ...cambios };
      local((d) => ({ ...d, viajes: d.viajes.map((x) => (x.id === v.id ? nuevo : x)) }));
      try {
        await guardar(supabase.from("viajes").update(viajeAFila(nuevo)).eq("id", v.id));
        if (texto) await log(v.id, texto, antes, despues);
      } catch (e) {
        fallo(e);
      }
    },
    async cambiarIns(x, cambios, texto, antes, despues) {
      local((d) => ({ ...d, inscripciones: d.inscripciones.map((y) => (y.id === x.id ? { ...y, ...cambios } : y)) }));
      try {
        await guardar(supabase.from("viajes_inscripciones").update(insAFila(cambios)).eq("id", x.id));
        if (texto) await log(x.viajeId, texto, antes, despues);
      } catch (e) {
        fallo(e);
      }
    },
    async agregarIns(v, ins, buzoNuevo, texto) {
      local((d) => ({ ...d, buzos: buzoNuevo ? [...d.buzos, buzoNuevo] : d.buzos, inscripciones: [...d.inscripciones, ins] }));
      try {
        if (buzoNuevo) await guardar(supabase.from("viajes_buzos").insert(buzoAFila(buzoNuevo)));
        await guardar(supabase.from("viajes_inscripciones").insert(insAFila(ins)));
        await log(v.id, texto);
      } catch (e) {
        fallo(e);
      }
    },
    async quitarIns(x, b, pagado, texto) {
      local((d) => ({
        ...d,
        inscripciones: d.inscripciones.map((y) => (y.id === x.id ? { ...y, estado: "quitado" } : y)),
        buzos: pagado > 0 ? d.buzos.map((y) => (y.id === b.id ? { ...y, abono: (y.abono || 0) + pagado } : y)) : d.buzos,
      }));
      try {
        await guardar(supabase.from("viajes_inscripciones").update({ estado: "quitado" }).eq("id", x.id));
        if (pagado > 0) await guardar(supabase.from("viajes_buzos").update({ abono: (b.abono || 0) + pagado }).eq("id", b.id));
        await log(x.viajeId, texto, "Inscrito", pagado > 0 ? `Abono a favor ${rd(pagado)}` : "Quitado");
      } catch (e) {
        fallo(e);
      }
    },
    async usarAbono(x, b, monto) {
      const pg = { id: nuevoId(), monto, cuenta: "Abono a favor", fecha: hoyISO(), por: yo.corto, conciliado: false, abono: true, nota: "Abono de un viaje anterior" };
      local((d) => ({
        ...d,
        inscripciones: d.inscripciones.map((y) => (y.id === x.id ? { ...y, pagos: [...(y.pagos || []), pg] } : y)),
        buzos: d.buzos.map((y) => (y.id === b.id ? { ...y, abono: Math.max(0, (y.abono || 0) - monto) } : y)),
      }));
      try {
        await guardar(supabase.from("viajes_inscripciones").update({ pagos: [...(x.pagos || []), pg] }).eq("id", x.id));
        await guardar(supabase.from("viajes_buzos").update({ abono: Math.max(0, (b.abono || 0) - monto) }).eq("id", b.id));
        await log(x.viajeId, `Usó su abono a favor: ${b.nombre}`, rd(b.abono), rd(Math.max(0, (b.abono || 0) - monto)));
      } catch (e) {
        fallo(e);
      }
    },
    async crearViaje(v) {
      local((d) => ({ ...d, viajes: [...d.viajes, v] }));
      try {
        await guardar(supabase.from("viajes").insert({ id: v.id, creado_por: yo.id, ...viajeAFila(v) }));
        await log(v.id, `Creó el viaje: ${v.nombre} (${v.fecha})`);
      } catch (e) {
        fallo(e);
      }
    },
    async cancelarViaje(v, motivo, abonos, antes) {
      const nuevo = { ...v, estado: "cancelado", motivoCancelado: motivo };
      local((d) => ({
        ...d,
        viajes: d.viajes.map((x) => (x.id === v.id ? nuevo : x)),
        buzos: d.buzos.map((b) => {
          const a = abonos.find((y) => y.buzoId === b.id);
          return a ? { ...b, abono: (b.abono || 0) + a.monto } : b;
        }),
      }));
      try {
        await guardar(supabase.from("viajes").update(viajeAFila(nuevo)).eq("id", v.id));
        for (const a of abonos) {
          const b = db.buzos.find((y) => y.id === a.buzoId);
          await guardar(supabase.from("viajes_buzos").update({ abono: (b?.abono || 0) + a.monto }).eq("id", a.buzoId));
        }
        await log(v.id, "Canceló el viaje", antes, `Cancelado${motivo ? ` (${motivo})` : ""}`);
      } catch (e) {
        fallo(e);
      }
    },
    async guardarPlantilla(c, esNueva) {
      local((d) => ({ ...d, catalogo: esNueva ? [...d.catalogo, c] : d.catalogo.map((x) => (x.id === c.id ? c : x)) }));
      try {
        if (esNueva) await guardar(supabase.from("viajes_catalogo").insert({ id: c.id, orden: 99, ...catalogoAFila(c) }));
        else await guardar(supabase.from("viajes_catalogo").update(catalogoAFila(c)).eq("id", c.id));
        await log(null, `${esNueva ? "Agregó al" : "Editó el"} Catálogo: ${c.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    async quitarPlantilla(c) {
      local((d) => ({ ...d, catalogo: d.catalogo.filter((x) => x.id !== c.id) }));
      try {
        await guardar(supabase.from("viajes_catalogo").update({ activo: false }).eq("id", c.id));
        await log(null, `Quitó del Catálogo: ${c.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    async guardarGenerales(lista) {
      const antes = db.generales;
      local((d) => ({ ...d, generales: lista }));
      try {
        const quitados = antes.filter((g) => !lista.some((x) => x.id === g.id));
        for (const g of quitados) await guardar(supabase.from("viajes_recordatorios").delete().eq("id", g.id));
        if (lista.length)
          await guardar(
            supabase
              .from("viajes_recordatorios")
              .upsert(lista.map((g, i) => ({ id: g.id, tipo: "general", dias: g.dias, texto: g.texto || "(sin texto)", para: g.para, correo: g.correo, orden: i + 1 })))
          );
        await log(null, "Editó los recordatorios generales");
      } catch (e) {
        fallo(e);
      }
    },
    async agregarLibre(l) {
      local((d) => ({ ...d, libres: [...d.libres, l] }));
      try {
        await guardar(supabase.from("viajes_recordatorios").insert({ id: l.id, tipo: "suelto", fecha: l.fecha, texto: l.texto, para: l.para, correo: l.correo }));
        await log(null, `Recordatorio nuevo (${l.fecha}): ${l.texto}`);
      } catch (e) {
        fallo(e);
      }
    },
    async marcarHecho(clave, valor, texto, viajeId) {
      local((d) => {
        const h = { ...d.hechos };
        if (valor) h[clave] = true;
        else delete h[clave];
        return { ...d, hechos: h };
      });
      try {
        if (valor) await guardar(supabase.from("viajes_hechos").upsert({ clave, hecho_por: yo.id }));
        else await guardar(supabase.from("viajes_hechos").delete().eq("clave", clave));
        if (valor && texto) await log(viajeId || null, `Recordatorio hecho: ${texto}`);
      } catch (e) {
        fallo(e);
      }
    },
    async crearBuzo(b) {
      local((d) => ({ ...d, buzos: [...d.buzos, b] }));
      try {
        await guardar(supabase.from("viajes_buzos").insert(buzoAFila(b)));
        await log(null, `Creó el buzo: ${b.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    // Comprobantes de pago (fotos o PDF): bucket privado "viajes-comprobantes".
    async verComprobante(c) {
      const w = window.open("", "_blank");
      const { data, error: e } = await supabase.storage.from("viajes-comprobantes").createSignedUrl(c.path, 600);
      if (e || !data?.signedUrl) {
        if (w) w.close();
        avisar("No se pudo abrir el comprobante.");
        return;
      }
      if (w) w.location = data.signedUrl;
      else window.location.href = data.signedUrl;
    },
    async adjuntarComprobante(x, file) {
      if (file.size > 10 * 1024 * 1024) return avisar("El archivo pesa más de 10 MB.");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${x.viajeId}/${x.id}/${Date.now()}.${ext}`;
      try {
        const { error: e } = await supabase.storage.from("viajes-comprobantes").upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (e) throw e;
        const c = { id: nuevoId(), path, nombre: file.name.slice(0, 80), fecha: hoyISO(), por: yo.corto, visto: true };
        await ops.cambiarIns(x, { comprobantes: [...(x.comprobantes || []), c] }, `Adjuntó comprobante: ${db.buzos.find((b) => b.id === x.buzoId)?.nombre || ""}`, "", c.nombre);
      } catch (e) {
        fallo(e);
      }
    },
    async guardarBuzo(b, cambios, texto) {
      local((d) => ({ ...d, buzos: d.buzos.map((x) => (x.id === b.id ? { ...x, ...cambios } : x)) }));
      try {
        await guardar(supabase.from("viajes_buzos").update(buzoAFila(cambios)).eq("id", b.id));
        await log(null, texto || `Editó los datos de ${b.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
  };

  const links = [
    { r: "inicio", t: "Viajes" },
    { r: "calendario", t: "Calendario" },
    ...(p.buzos ? [{ r: "buzos", t: "Buzos" }] : []),
    ...(p.editarViaje ? [{ r: "catalogo", t: "Catálogo de viajes" }] : []),
    ...(p.estadisticas ? [{ r: "estadisticas", t: "Estadísticas" }] : []),
    { r: "historial", t: "Historial" },
  ];
  const activo = ruta.startsWith("buzo")
    ? "buzos"
    : ruta.startsWith("catalogo") || ruta.startsWith("plantilla")
    ? "catalogo"
    : ["calendario", "historial", "estadisticas", "accesos"].includes(ruta)
    ? ruta
    : "inicio";

  let cuerpo = null;
  if (error) {
    cuerpo = (
      <div className="card aviso-box">
        No se pudieron cargar los viajes: {error}
        <div className="hint-text" style={{ marginTop: 6 }}>
          Si es la primera vez, falta correr la migración migration_71.sql en Supabase.
        </div>
      </div>
    );
  } else if (!db) {
    cuerpo = <div className="hint-text">Cargando…</div>;
  } else {
    const q = { db, setDb, ops, p, rol, yo, ir, avisar, recargar, supabase, personas, calUrl };
    if (ruta === "inicio") cuerpo = <Inicio {...q} />;
    else if (ruta === "calendario") cuerpo = <Calendario {...q} />;
    else if (ruta === "nuevo") cuerpo = p.editarViaje ? <NuevoViaje {...q} /> : <Inicio {...q} />;
    else if (ruta.startsWith("viaje:")) {
      const [, id, tab] = ruta.split(":");
      cuerpo = db.viajes.some((v) => v.id === id) ? <Viaje key={id} {...q} id={id} tab={tab || "inscritos"} /> : <div className="hint-text">Ese viaje no existe.</div>;
    } else if (ruta.startsWith("reporte:")) {
      const id = ruta.split(":")[1];
      cuerpo = db.viajes.some((v) => v.id === id) ? <Reporte {...q} id={id} /> : null;
    } else if (ruta === "buzos") cuerpo = p.buzos ? <Buzos {...q} /> : <Inicio {...q} />;
    else if (ruta.startsWith("buzo:")) cuerpo = db.buzos.some((b) => b.id === ruta.split(":")[1]) ? <FichaBuzo {...q} id={ruta.split(":")[1]} /> : null;
    else if (ruta === "catalogo") cuerpo = p.editarViaje ? <Catalogo {...q} /> : <Inicio {...q} />;
    else if (ruta.startsWith("plantilla:")) cuerpo = p.editarViaje && db.catalogo.some((c) => c.id === ruta.split(":")[1]) ? <EditarPlantilla key={ruta} {...q} id={ruta.split(":")[1]} /> : null;
    else if (ruta === "historial") cuerpo = <Historial {...q} />;
    else if (ruta === "estadisticas") cuerpo = p.estadisticas ? <Estadisticas {...q} /> : <Inicio {...q} />;
    else if (ruta === "accesos") cuerpo = yo.esTitular ? <AccesosViajes {...q} /> : <Inicio {...q} />;
    else cuerpo = <Inicio {...q} />;
  }

  return (
    <div className="vj-app">
      <Topbar
        nombre={yo.corto}
        nombreCompleto={yo.nombre}
        correo={yo.correo}
        esTitular={yo.esTitular}
        verChangelog={yo.verChangelog}
        links={links}
        activo={activo}
        ir={ir}
      />
      <div className="page vj-page">{cuerpo}</div>
      {toast && <div className="vj-toast">{toast}</div>}
      {children}
    </div>
  );
}
