"use client";

import FechaHoy from "@/components/FechaHoy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { achicar, tipoDe } from "@/lib/estudiantes/subir";
import CampanaNotificaciones from "@/components/CampanaNotificaciones";
import NotificacionesPagina from "@/components/NotificacionesPagina";
import { IconGear, IconLogout, IconShuffle, IconHistory, IconUsers } from "@/components/icons";
import { cargarTodo, estAFila, buzoAFila, cursoAFila, interesadoAFila, nuevoId } from "@/lib/estudiantes/datos";
import { Inicio, Lista, Mas, Bitacora } from "./Inicio";
import { Ficha } from "./Ficha";
import { Nuevo } from "./Nuevo";
import { Cursos } from "./Cursos";
import { Interesados } from "./Interesados";
import { AdminEst } from "./AdminEst";

// Control Estudiantes (migration_78.sql). Mismo esquema que Buceos: un solo
// componente para todas las pantallas (/control-estudiantes/...), los datos
// se cargan una vez, cada cambio se guarda en Supabase y queda en la
// bitácora (quién, cuándo, antes -> después).

const BASE = "/control-estudiantes";

export function rutaDeUrl(path) {
  const p = (path || "").replace(/^\/control-estudiantes\/?/, "").split("/").filter(Boolean);
  if (!p.length) return "inicio";
  if (p[0] === "estudiante" && p[1]) return `estudiante:${p[1]}`;
  if (p[0] === "estudiantes" && p[1]) return `estudiantes:${p[1]}`;
  if (p[0] === "nuevo" && p[1]) return `nuevo:${p[1]}`;
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
    <div className="topbar ce-topbar">
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
        {/* V54: la campanita, como en los otros apps ("62. si": aviso cuando
            alguien se registra por el link, sube un comprobante o llega un
            interesado nuevo). */}
        <div className="topbar-iconos">
        <CampanaNotificaciones app="estudiantes" rutaTodas={`${BASE}/notificaciones`} />
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
              {yo.esTitular && (
                <a className="settings-menu-link" onClick={() => (setOpen(false), ir("administracion"))} style={{ cursor: "pointer" }}>
                  <IconUsers size={15} /> Administración
                  <span className="settings-menu-tag">TITULAR</span>
                </a>
              )}
              {yo.verChangelog && (
                <Link href="/changelog?desde=estudiantes" className="settings-menu-link" onClick={() => setOpen(false)}>
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
      <div className="topbar-appname">CONTROL ESTUDIANTES</div>
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

export default function EstudiantesApp({ p, yo, personas }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [db, setDb] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const ruta = rutaDeUrl(pathname);

  const recargar = useCallback(async () => {
    try {
      setDb(await cargarTodo(supabase, { conInteresados: p.interesados || p.estudiantes }));
      setError("");
    } catch (e) {
      setError(e.message || String(e));
    }
  }, [supabase, p.interesados, p.estudiantes]);
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
  const local = (fn) => setDb((d) => fn(d));
  const fallo = (e) => {
    const m = String(e?.message || e);
    avisar(/documento_uq/.test(m) ? "Esa cédula ya está en la base, con otra persona." : /pasaporte_uq/.test(m) ? "Ese pasaporte ya está en la base, con otra persona." : `No se pudo guardar: ${m}`);
    recargar();
  };
  const guardar = async (promesa) => {
    const { error: e } = await promesa;
    if (e) throw e;
  };
  const log = async (estudianteId, texto, antes, despues) => {
    const fila = { id: nuevoId(), estudiante_id: estudianteId || null, user_id: yo.id, nombre: yo.corto, texto, antes: antes ?? null, despues: despues ?? null };
    setDb((d) => ({ ...d, bitacora: [{ id: fila.id, estudianteId: fila.estudiante_id, quien: yo.corto, texto, antes, despues, cuando: new Date().toISOString() }, ...d.bitacora] }));
    await supabase.from("est_bitacora").insert(fila);
  };
  const sello = () => ({ en: new Date().toISOString(), por: yo.corto });

  const ops = {
    sello,
    async cambiarEst(est, cambios, texto, antes, despues) {
      local((d) => ({ ...d, estudiantes: d.estudiantes.map((x) => (x.id === est.id ? { ...x, ...cambios } : x)) }));
      try {
        await guardar(supabase.from("est_estudiantes").update(estAFila(cambios)).eq("id", est.id));
        if (texto) await log(est.id, texto, antes, despues);
      } catch (e) {
        fallo(e);
      }
    },
    async cambiarBuzo(b, cambios, texto) {
      local((d) => ({ ...d, buzos: d.buzos.map((x) => (x.id === b.id ? { ...x, ...cambios } : x)) }));
      try {
        await guardar(supabase.from("viajes_buzos").update(buzoAFila(cambios)).eq("id", b.id));
        if (texto) await log(null, texto);
      } catch (e) {
        fallo(e);
      }
    },
    async crearEst(est, buzoNuevo, interesado) {
      local((d) => ({
        ...d,
        buzos: buzoNuevo ? [...d.buzos, buzoNuevo] : d.buzos,
        estudiantes: [est, ...d.estudiantes],
        interesados: interesado ? d.interesados.map((x) => (x.id === interesado.id ? { ...x, estado: "inscrito", estudianteId: est.id } : x)) : d.interesados,
      }));
      try {
        if (buzoNuevo) await guardar(supabase.from("viajes_buzos").insert(buzoAFila(buzoNuevo)));
        await guardar(supabase.from("est_estudiantes").insert({ ...estAFila(est), creado_por: yo.id }));
        if (interesado) await guardar(supabase.from("est_interesados").update(interesadoAFila({ estado: "inscrito", estudianteId: est.id })).eq("id", interesado.id));
        await log(est.id, `Registró un estudiante: ${(buzoNuevo || db.buzos.find((b) => b.id === est.buzoId))?.nombre || ""} (${est.curso})`);
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
    async borrarEst(est, motivo, nombre) {
      try {
        await log(null, `Borró un estudiante: ${nombre} (${est.curso})`, null, `Borrado. Motivo: ${motivo}`);
        await guardar(supabase.from("est_estudiantes").delete().eq("id", est.id));
        local((d) => ({ ...d, estudiantes: d.estudiantes.filter((x) => x.id !== est.id) }));
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
    async guardarCurso(c, esNuevo) {
      local((d) => ({ ...d, cursos: esNuevo ? [...d.cursos, c] : d.cursos.map((x) => (x.id === c.id ? c : x)) }));
      try {
        if (esNuevo) await guardar(supabase.from("est_cursos").insert({ id: c.id, ...cursoAFila(c) }));
        else await guardar(supabase.from("est_cursos").update(cursoAFila(c)).eq("id", c.id));
        await log(null, `${esNuevo ? "Agregó el curso" : "Cambió el curso"}: ${c.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    async guardarInstructor(i, esNuevo) {
      local((d) => ({ ...d, instructores: esNuevo ? [...d.instructores, i] : d.instructores.map((x) => (x.id === i.id ? i : x)) }));
      try {
        if (esNuevo) await guardar(supabase.from("est_instructores").insert({ id: i.id, nombre: i.nombre, orden: 99 }));
        else await guardar(supabase.from("est_instructores").update({ nombre: i.nombre, activo: i.activo }).eq("id", i.id));
        await log(null, `${esNuevo ? "Agregó el instructor" : i.activo ? "Cambió el instructor" : "Quitó el instructor"}: ${i.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    async guardarInteresado(x, esNuevo, texto) {
      local((d) => ({ ...d, interesados: esNuevo ? [x, ...d.interesados] : d.interesados.map((y) => (y.id === x.id ? x : y)) }));
      try {
        if (esNuevo) await guardar(supabase.from("est_interesados").insert({ ...interesadoAFila(x), creado_por: yo.id }));
        else await guardar(supabase.from("est_interesados").update(interesadoAFila(x)).eq("id", x.id));
        if (texto) await log(null, texto);
      } catch (e) {
        fallo(e);
      }
    },
    async verArchivo(ruta) {
      const { data, error: e } = await supabase.storage.from("estudiantes-docs").createSignedUrl(ruta, 600);
      if (e || !data?.signedUrl) return avisar("No se pudo abrir el archivo.");
      window.open(data.signedUrl, "_blank", "noopener");
    },
    async subirArchivo(est, original, tipo) {
      // V54: las fotos grandes se achican antes, y el tipo de un HEIC o un
      // PDF se saca del nombre si el navegador no lo dice (lib/estudiantes/subir.js).
      const archivo = await achicar(original);
      const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
      const ruta = `${est.id}/${tipo}-${Date.now()}.${ext}`;
      const { error: e } = await supabase.storage.from("estudiantes-docs").upload(ruta, archivo, { contentType: tipoDe(archivo) || undefined });
      if (e) {
        avisar(`No se pudo subir: ${e.message}`);
        return null;
      }
      return ruta;
    },
  };

  const links = [
    { r: "inicio", t: "Inicio" },
    { r: "estudiantes", t: "Estudiantes" },
    ...(p.interesados ? [{ r: "interesados", t: "Interesados" }] : []),
    { r: "cursos", t: "Cursos" },
    { r: "mas", t: "Más" },
  ];
  const activo = ruta.startsWith("estudiante") || ruta.startsWith("nuevo") ? "estudiantes" : ["bitacora", "administracion"].includes(ruta) ? "mas" : ruta.split(":")[0];
  const q = { db, p, yo, ops, ir, avisar, personas };

  let cuerpo = null;
  if (error)
    cuerpo = (
      <div className="card">
        <b>No se pudieron cargar los datos.</b>
        <div className="hint-text" style={{ marginTop: 4 }}>
          {/est_|does not exist|relation/.test(error) ? "Falta correr migration_78.sql en Supabase." : error}
        </div>
      </div>
    );
  else if (!db) cuerpo = <div className="hint-text">Cargando…</div>;
  else if (ruta === "inicio") cuerpo = <Inicio {...q} />;
  else if (ruta === "estudiantes" || ruta.startsWith("estudiantes:")) cuerpo = <Lista {...q} filtroInicial={ruta.split(":")[1] || "curso"} />;
  else if (ruta.startsWith("estudiante:")) {
    const id = ruta.split(":")[1];
    cuerpo = db.estudiantes.some((x) => x.id === id) ? <Ficha key={id} {...q} id={id} /> : <div className="hint-text">Ese estudiante no existe.</div>;
  } else if (ruta === "nuevo" || ruta.startsWith("nuevo:")) cuerpo = p.estudiantes ? <Nuevo {...q} interesadoId={ruta.split(":")[1] || null} /> : <Inicio {...q} />;
  else if (ruta === "interesados") cuerpo = p.interesados ? <Interesados {...q} /> : <Inicio {...q} />;
  else if (ruta === "cursos") cuerpo = <Cursos {...q} />;
  else if (ruta === "mas") cuerpo = <Mas {...q} />;
  else if (ruta === "bitacora") cuerpo = <Bitacora {...q} />;
  else if (ruta === "notificaciones")
    cuerpo = (
      <>
        <h1 className="page-title">Notificaciones</h1>
        <NotificacionesPagina app="estudiantes" explicacion="Te llega aquí cuando alguien se registra por el link, sube un comprobante de pago o deja sus datos en Me interesa (según lo que puedes hacer en Control Estudiantes)." sinCelular />
      </>
    );
  else if (ruta === "administracion") cuerpo = yo.esTitular ? <AdminEst {...q} /> : <Inicio {...q} />;
  else cuerpo = <Inicio {...q} />;

  return (
    <div className="ce-app">
      <Topbar yo={yo} links={links} activo={activo} ir={ir} />
      <div className="page" style={{ paddingTop: 18 }}>
        {cuerpo}
      </div>
      {toast && <div className="vj-toast">{toast}</div>}
    </div>
  );
}
