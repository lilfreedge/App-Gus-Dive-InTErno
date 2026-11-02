"use client";

import FechaHoy from "@/components/FechaHoy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconGear, IconLogout, IconShuffle, IconHistory } from "@/components/icons";
import { cargarTodo, alquilerAFila, itemAFila, buzoAFila, filaABuzo, nuevoId } from "@/lib/alquiler/datos";
import { moraDe, rd, hoyISO } from "@/lib/alquiler/modelo";
import { Inicio, Lista, Detalle, Nuevo, Retornos, Equipos, Mas, Bitacora, Precios, Estadisticas, Reporte } from "./Pantallas";

// App Alquiler (migration_82.sql). Mismo esquema que Control Estudiantes:
// un solo componente para todas las pantallas (/alquiler/...), los datos se
// cargan una vez, cada cambio se guarda en Supabase y queda en la bitácora.

const BASE = "/alquiler";

export function rutaDeUrl(path) {
  const p = (path || "").replace(/^\/alquiler\/?/, "").split("/").filter(Boolean);
  if (!p.length) return "inicio";
  if (p[0] === "ver" && p[1]) return `ver:${p[1]}`;
  if (p[0] === "alquiler" && p[1]) return `alquiler:${p[1]}`;
  if (p[0] === "retornos" && p[1]) return `retornos:${p[1]}`;
  return p[0];
}
export function urlDeRuta(r) {
  const [k, id] = r.split(":");
  if (k === "inicio") return BASE;
  return `${BASE}/${k}${id ? `/${id}` : ""}`;
}

function Topbar({ yo, links, activo, ir }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const f = (e) => menuRef.current && !menuRef.current.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);
  async function salir() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <div className="topbar alq-topbar">
      <div className="topbar-inner">
        <div>
          <a className="topbar-logo-link" href={BASE} onClick={(e) => (e.preventDefault(), ir("inicio"))} aria-label="Ir al inicio">
            <Image src="/logo-gus-icon.png" alt="Gus Dive" width={64} height={22} className="topbar-logo" priority />
          </a>
          <div className="topbar-sub">
            Hola, {yo.corto}
            <FechaHoy />
          </div>
        </div>
        <div className="topbar-iconos">
          <div className="gear-wrap" ref={menuRef}>
            <button className="gear-btn" onClick={() => setOpen((o) => !o)} aria-label="Ajustes">
              <IconGear size={18} />
            </button>
            {open && (
              <div className="settings-menu">
                <div className="settings-menu-who">
                  <b>{yo.nombre}</b>
                  {yo.correo}
                </div>
                {yo.verChangelog && (
                  <Link href="/changelog?desde=alquiler" className="settings-menu-link" onClick={() => setOpen(false)}>
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
      <div className="topbar-appname">ALQUILER</div>
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

export default function AlquilerApp({ p, yo }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [db, setDb] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const ruta = rutaDeUrl(pathname);

  const recargar = useCallback(async () => {
    try {
      setDb(await cargarTodo(supabase));
      setError("");
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [supabase]);
  useEffect(() => {
    recargar();
  }, [recargar]);

  const ir = (r) => {
    router.push(urlDeRuta(r));
    window.scrollTo(0, 0);
  };
  const avisar = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2800);
  };
  const local = (fn) => setDb((d) => fn(d));
  const fallo = (e) => {
    const m = String(e?.message || e);
    avisar(/documento_uq/.test(m) ? "Esa cédula ya está en la base, con otra persona." : /pasaporte_uq/.test(m) ? "Ese pasaporte ya está en la base, con otra persona." : /alq_equipos_codigo_uq|duplicate/.test(m) ? "Ese código ya existe." : `No se pudo guardar: ${m}`);
    recargar();
  };
  const guardar = async (promesa) => {
    const { error: e } = await promesa;
    if (e) throw e;
  };
  const log = async (alquilerId, texto, antes, despues) => {
    const fila = { id: nuevoId(), alquiler_id: alquilerId || null, user_id: yo.id, nombre: yo.corto, texto, antes: antes ?? null, despues: despues ?? null };
    setDb((d) => ({ ...d, bitacora: [{ id: fila.id, alquilerId: fila.alquiler_id, quien: yo.corto, texto, antes, despues, cuando: new Date().toISOString() }, ...d.bitacora] }));
    await supabase.from("alq_bitacora").insert(fila);
  };
  const nombreDe = (buzoId) => db?.buzos.find((b) => b.id === buzoId)?.nombre || "—";

  const ops = {
    // Un alquiler nuevo. `buzoNuevo`: { nombre, doc, pasaporte, cel } si la
    // persona no estaba en la base (es la misma de Buceos y Estudiantes).
    async crearAlquiler(a, buzoNuevo) {
      try {
        let buzoId = a.buzoId;
        if (buzoNuevo) {
          const { data, error: e } = await supabase.from("viajes_buzos").insert(buzoAFila(buzoNuevo)).select("*").single();
          if (e) throw e;
          buzoId = data.id;
          local((d) => ({ ...d, buzos: [...d.buzos, filaABuzo(data)] }));
        }
        const id = nuevoId();
        const { data: fila, error: e1 } = await supabase
          .from("alq_alquileres")
          .insert({ id, ...alquilerAFila({ ...a, buzoId }), creado_por_nombre: yo.corto })
          .select("*")
          .single();
        if (e1) throw e1;
        const items = a.items.map((x) => ({ ...x, id: nuevoId() }));
        await guardar(supabase.from("alq_items").insert(items.map((x) => itemAFila(x, id))));
        const nuevo = { ...a, id, numero: fila.numero, buzoId, creadoPor: yo.corto, creadoEn: fila.creado_en, items: items.map((x) => ({ ...x, alquilerId: id, devueltoEn: null })) };
        local((d) => ({ ...d, alquileres: [nuevo, ...d.alquileres] }));
        const nombre = buzoNuevo ? buzoNuevo.nombre : nombreDe(buzoId);
        await log(id, `Alquiler No. ${fila.numero}: ${nombre}`, null, `${items.map((x) => x.codigo).join(", ")} · ${a.dias === 6 ? "doble" : "normal"} · ${rd(items.reduce((s, x) => s + x.total, 0))}${a.factura ? ` · factura ${a.factura}` : " · sin factura"}`);
        return nuevo;
      } catch (e) {
        fallo(e);
        return null;
      }
    },
    async cambiarAlquiler(a, cambios, texto, antes, despues) {
      const nuevo = { ...a, ...cambios };
      local((d) => ({ ...d, alquileres: d.alquileres.map((x) => (x.id === a.id ? nuevo : x)) }));
      try {
        await guardar(supabase.from("alq_alquileres").update(alquilerAFila(nuevo)).eq("id", a.id));
        await log(a.id, `${texto}: alquiler No. ${a.numero} (${nombreDe(a.buzoId)})`, antes, despues);
      } catch (e) {
        fallo(e);
      }
    },
    // Retornar equipos ("130": todo junto o por equipo; la mora por artículo).
    // `quien`: quién lo trajo, si no fue el cliente.
    async retornar(a, ids, quien) {
      const ahora = new Date().toISOString();
      const hoy = hoyISO();
      const cambios = a.items
        .filter((x) => ids.includes(x.id) && !x.devueltoEn)
        .map((x) => {
          const m = moraDe(x, a, hoy);
          return { ...x, devueltoEn: ahora, devueltoPor: quien || "", recibidoPor: yo.corto, moraDias: m.dias, mora: m.monto };
        });
      if (!cambios.length) return 0;
      const items = a.items.map((x) => cambios.find((y) => y.id === x.id) || x);
      local((d) => ({ ...d, alquileres: d.alquileres.map((x) => (x.id === a.id ? { ...a, items } : x)) }));
      try {
        for (const x of cambios) {
          await guardar(
            supabase
              .from("alq_items")
              .update({ devuelto_en: x.devueltoEn, devuelto_por: x.devueltoPor || null, recibido_por: x.recibidoPor, mora_dias: x.moraDias, mora: x.mora })
              .eq("id", x.id)
          );
        }
        const mora = cambios.reduce((s, x) => s + x.mora, 0);
        await log(
          a.id,
          `Retorno del alquiler No. ${a.numero} (${nombreDe(a.buzoId)})`,
          cambios.map((x) => x.codigo).join(", "),
          `${quien ? `Lo trajo: ${quien}. ` : ""}${mora ? `Mora: ${rd(mora)}` : "Sin mora"}`
        );
        return mora;
      } catch (e) {
        fallo(e);
        return null;
      }
    },
    // V58: precios por tipo (migration_83).
    async guardarPrecioTipo(tipo, precio) {
      const antes = db.preciosTipo[tipo];
      local((d) => ({ ...d, preciosTipo: { ...d.preciosTipo, [tipo]: precio } }));
      try {
        await guardar(supabase.from("alq_precios_tipo").upsert({ tipo, precio, actualizado_en: new Date().toISOString() }));
        await log(null, `Precio por tipo: ${tipo}`, antes == null ? "sin precio" : rd(antes), precio == null ? "sin precio" : rd(precio));
        avisar("Precio guardado");
      } catch (e) {
        fallo(e);
      }
    },
    // "Usar este precio en todos": se les quita el precio propio.
    async usarPrecioTipo(tipo, equipos) {
      try {
        for (const fuente of ["tanques", "reguladores", "otros"]) {
          const ids = equipos.filter((e) => e.fuente === fuente).map((e) => e.id);
          if (!ids.length) continue;
          const tabla = fuente === "tanques" ? "tanques_alquiler" : fuente === "reguladores" ? "reguladores_alquiler" : "alq_equipos";
          await guardar(supabase.from(tabla).update(fuente === "otros" ? { precio: null } : { precio_alquiler: null }).in("id", ids));
        }
        local((d) => ({ ...d, equipos: d.equipos.map((e) => (equipos.some((x) => x.id === e.id && x.fuente === e.fuente) ? { ...e, precio: null } : e)) }));
        await log(null, `Usar el precio del tipo ${tipo} en todos`, equipos.map((e) => `${e.codigo} ${rd(e.precio)}`).join(", "), `Precio del tipo: ${rd(db.preciosTipo[tipo])}`);
        avisar("Listo");
      } catch (e) {
        fallo(e);
      }
    },
    async guardarEquipo(eq, esNuevo, antes) {
      const tabla = eq.fuente === "tanques" ? "tanques_alquiler" : eq.fuente === "reguladores" ? "reguladores_alquiler" : "alq_equipos";
      const fila =
        tabla === "alq_equipos"
          ? { tipo: eq.tipo, codigo: eq.codigo, descripcion: eq.descripcion || null, precio: eq.precio, activo: eq.activo !== false, actualizado_en: new Date().toISOString() }
          : { codigo: eq.codigo, descripcion: eq.descripcion || null, precio_alquiler: eq.precio, activo: eq.activo !== false };
      try {
        if (esNuevo) {
          const { data, error: e } = await supabase.from(tabla).insert(fila).select("id").single();
          if (e) throw e;
          eq = { ...eq, id: data.id };
          local((d) => ({ ...d, equipos: [...d.equipos, eq] }));
        } else {
          const { data, error: e } = await supabase.from(tabla).update(fila).eq("id", eq.id).select("id");
          if (e) throw e;
          if (!data?.length) {
            avisar("No se pudo guardar: no tienes permiso para cambiar equipos.");
            return false;
          }
          local((d) => ({ ...d, equipos: eq.activo === false ? d.equipos.filter((x) => x.id !== eq.id) : d.equipos.map((x) => (x.id === eq.id ? eq : x)) }));
        }
        await log(
          null,
          `${esNuevo ? "Agregó el equipo" : eq.activo === false ? "Quitó el equipo" : "Cambió el equipo"} ${eq.codigo}`,
          antes ? `${antes.descripcion || "—"} · ${antes.precio == null ? "sin precio" : rd(antes.precio)}` : null,
          `${eq.descripcion || "—"} · ${eq.precio == null ? "sin precio" : rd(eq.precio)}`
        );
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
  };

  if (error) {
    return (
      <div className="alq-app">
        <div className="page" style={{ paddingTop: 30 }}>
          <div className="aviso-box">No se pudo cargar Alquiler: {error}</div>
        </div>
      </div>
    );
  }
  if (!db) {
    return (
      <div className="alq-app">
        <Topbar yo={yo} links={[]} activo="" ir={ir} />
        <div className="page" style={{ paddingTop: 30 }}>
          <div className="hint-text">Cargando…</div>
        </div>
      </div>
    );
  }

  // "127": Inicio, Alquiler (con Nuevo alquiler adentro), Retornos, Equipos y Más.
  const links = [
    { r: "inicio", t: "Inicio" },
    { r: "alquiler", t: "Alquiler" },
    { r: "retornos", t: "Retornos" },
    { r: "equipos", t: "Equipos" },
    { r: "mas", t: "Más" },
  ];
  const [k, id] = ruta.split(":");
  const q = { db, p, yo, ops, ir, avisar };
  let cuerpo;
  if (db.falta) cuerpo = <div className="aviso-box">Falta correr en Supabase el SQL de la V57 (todo_v57_una_sola_vez.sql) para usar Alquiler.</div>;
  else if (k === "inicio") cuerpo = <Inicio {...q} />;
  else if (k === "alquiler") cuerpo = <Lista {...q} filtroInicial={id} />;
  else if (k === "ver") cuerpo = <Detalle {...q} id={id} />;
  else if (k === "nuevo") cuerpo = <Nuevo {...q} />;
  else if (k === "retornos") cuerpo = <Retornos {...q} id={id} />;
  else if (k === "equipos") cuerpo = <Equipos {...q} />;
  else if (k === "mas") cuerpo = <Mas {...q} />;
  else if (k === "bitacora") cuerpo = <Bitacora {...q} />;
  else if (k === "precios") cuerpo = <Precios {...q} />;
  else if (k === "estadisticas") cuerpo = <Estadisticas {...q} />;
  else if (k === "reporte") cuerpo = <Reporte {...q} />;
  else cuerpo = <Inicio {...q} />;
  const activo = ["ver", "nuevo"].includes(k) ? "alquiler" : ["bitacora", "precios", "estadisticas", "reporte"].includes(k) ? "mas" : k;

  return (
    <div className="alq-app">
      <Topbar yo={yo} links={links} activo={activo} ir={ir} />
      <div className="page" style={{ paddingTop: 18 }}>
        {cuerpo}
      </div>
      {toast && <div className="vj-toast">{toast}</div>}
    </div>
  );
}
