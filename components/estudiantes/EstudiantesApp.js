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
import { cargarTodo, estAFila, buzoAFila, cursoAFila, interesadoAFila, fechaAFila, nuevoId } from "@/lib/estudiantes/datos";
import { fechaCursoCorta } from "@/lib/estudiantes/modelo";
import { Inicio, Lista, Mas, Bitacora, Directorio, DetalleCurso, PorEtapa } from "./Inicio";
import { Ficha } from "./Ficha";
import { Nuevo } from "./Nuevo";
import { Cursos } from "./Cursos";
import { Interesados } from "./Interesados";
import { AdminEst } from "./AdminEst";
import { Calendario } from "./Calendario";
import { Estadisticas } from "@/components/estudiantes/Estadisticas";

// Control Estudiantes (migration_78.sql). Mismo esquema que Buceos: un solo
// componente para todas las pantallas (/control-estudiantes/...), los datos
// se cargan una vez, cada cambio se guarda en Supabase y queda en la
// bitácora (quién, cuándo, antes -> después).

const BASE = "/control-estudiantes";

export function rutaDeUrl(path) {
  const p = (path || "").replace(/^\/control-estudiantes\/?/, "").split("/").filter(Boolean);
  if (!p.length) return "inicio";
  if (p[0] === "estudiante" && p[1]) return `estudiante:${p[1]}`;
  // V55: los filtros pasaron a Cursos; los enlaces viejos siguen sirviendo.
  if (p[0] === "estudiantes" && p[1]) return `cursos:${p[1]}`;
  if (p[0] === "cursos" && p[1]) return `cursos:${p[1]}`;
  if (p[0] === "nuevo" && p[1]) return `nuevo:${p[1]}`;
  if (p[0] === "curso" && p[1]) return `curso:${p[1]}`;
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
          {/* V54: el logo de SNSI, la escuela que representan, al lado del de
              GUS (maqueta-v54b: "76. 1"). */}
          <div className="ce-logos">
            <a className="topbar-logo-link" href={BASE} onClick={(e) => (e.preventDefault(), ir("inicio"))} aria-label="Ir al inicio">
              <Image src="/logo-gus-icon.png" alt="Gus Dive" width={64} height={22} className="topbar-logo" priority />
            </a>
            <span className="ce-logos-sep" />
            <img src="/logo-snsi.png" alt="SNSI" className="ce-logo-snsi" />
          </div>
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
        const fila = { ...estAFila(est), creado_por: yo.id };
        if (fila.fecha_id == null) delete fila.fecha_id; // por si falta el SQL de la V55
        await guardar(supabase.from("est_estudiantes").insert(fila));
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
        // V57: se revisa que de verdad se borró (sin el permiso, Supabase no
        // da error pero no borra nada).
        const { data, error: e } = await supabase.from("est_estudiantes").delete().eq("id", est.id).select("id");
        if (e) throw e;
        if (!data?.length) {
          avisar("No se pudo borrar. Si tienes el permiso Borrar estudiantes, falta correr en Supabase el SQL de la V67 (todo_v67_una_sola_vez.sql).");
          return false;
        }
        await log(null, `Borró un estudiante: ${nombre} (${est.curso})`, null, `Borrado. Motivo: ${motivo}`);
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
        else {
          // V59: se revisa que de verdad se guardó (nota 2-nov: le cambió el
          // nombre a un curso y en el link seguía el nombre viejo).
          const { data, error: e } = await supabase.from("est_cursos").update(cursoAFila(c)).eq("id", c.id).select("id");
          if (e) throw e;
          if (!data?.length) {
            avisar("No se guardó el cambio del curso (sin permiso). Recarga la página y vuelve a intentar.");
            recargar();
            return;
          }
        }
        await log(null, `${esNuevo ? "Agregó el curso" : "Cambió el curso"}: ${c.nombre}`);
      } catch (e) {
        fallo(e);
      }
    },
    // V55: borrar un curso (solo el Titular; sus fechas se van con él).
    async borrarCurso(c) {
      try {
        const { data, error: e } = await supabase.from("est_cursos").delete().eq("id", c.id).select("id");
        if (e) throw e;
        if (!data?.length) {
          avisar("No se pudo borrar: solo el Titular puede, y hace falta correr el SQL de la V55.");
          return false;
        }
        local((d) => ({ ...d, cursos: d.cursos.filter((x) => x.id !== c.id), fechas: (d.fechas || []).filter((f) => f.cursoId !== c.id) }));
        await log(null, `Borró el curso: ${c.nombre}`);
        avisar("Curso borrado");
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
    // V55: las fechas de cada curso ("64", "72. sí" cupo).
    async guardarFecha(f, esNueva, c) {
      try {
        if (esNueva) await guardar(supabase.from("est_fechas").insert({ id: f.id, ...fechaAFila(f), creado_por: yo.id }));
        else await guardar(supabase.from("est_fechas").update(fechaAFila(f)).eq("id", f.id));
        local((d) => ({ ...d, fechas: esNueva ? [...(d.fechas || []), f] : (d.fechas || []).map((x) => (x.id === f.id ? f : x)) }));
        // Los estudiantes de esa fecha quedan con su día de inicio.
        if (!esNueva) {
          const de = db.estudiantes.filter((e) => e.fechaId === f.id && e.fechaInicio !== f.inicio);
          for (const e of de) await guardar(supabase.from("est_estudiantes").update(estAFila({ fechaInicio: f.inicio })).eq("id", e.id));
          if (de.length) local((d) => ({ ...d, estudiantes: d.estudiantes.map((e) => (e.fechaId === f.id ? { ...e, fechaInicio: f.inicio } : e)) }));
        }
        await log(null, `${esNueva ? "Agregó una fecha" : "Cambió la fecha"}: ${c.nombre} · ${fechaCursoCorta(f.inicio)}${f.cupo ? ` · cupo ${f.cupo}` : ""}`);
        avisar(esNueva ? "Fecha agregada" : "Fecha guardada");
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
    async borrarFecha(f, c) {
      try {
        const { data, error: e } = await supabase.from("est_fechas").delete().eq("id", f.id).select("id");
        if (e) throw e;
        if (!data?.length) {
          avisar("No se pudo borrar: solo el Titular puede borrar fechas.");
          return false;
        }
        // V64 ("283"): sus estudiantes (los que estaban en curso) ya no salen en
        // el curso: quedan cancelados, con su ficha y su historia en la base.
        const quitar = db.estudiantes.filter((e) => e.fechaId === f.id && e.estado === "curso");
        if (quitar.length) await supabase.from("est_estudiantes").update({ estado: "cancelado", actualizado_en: new Date().toISOString() }).in("id", quitar.map((e) => e.id));
        local((d) => ({ ...d, fechas: (d.fechas || []).filter((x) => x.id !== f.id), estudiantes: d.estudiantes.map((e) => (e.fechaId === f.id ? { ...e, fechaId: null, ...(e.estado === "curso" ? { estado: "cancelado" } : {}) } : e)) }));
        for (const e of quitar) await log(e.id, `Se borró su curso (${c.nombre} · ${fechaCursoCorta(f.inicio)})`, "En curso", "Cancelado");
        await log(null, `Borró la fecha: ${c.nombre} · ${fechaCursoCorta(f.inicio)}${quitar.length ? ` (${quitar.length} estudiante${quitar.length === 1 ? "" : "s"} quedaron cancelados)` : ""}`);
        avisar("Fecha borrada");
        return true;
      } catch (e) {
        fallo(e);
        return false;
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
      // V62 ("245"): con el seguimiento. Si todavía no se corrió la
      // migration_88 (no existe la columna), se guarda lo demás y se avisa.
      const subir = (sin) =>
        esNuevo ? supabase.from("est_interesados").insert({ ...interesadoAFila(x, { sinSeguimiento: sin }), creado_por: yo.id }) : supabase.from("est_interesados").update(interesadoAFila(x, { sinSeguimiento: sin })).eq("id", x.id);
      try {
        const r = await subir(false);
        if (r.error && /seguimiento/.test(`${r.error.message || ""} ${r.error.details || ""}`)) {
          await guardar(subir(true));
          avisar("Se guardó, pero el seguimiento no: falta correr el SQL de la V62 en Supabase.");
        } else if (r.error) throw r.error;
        if (texto) await log(null, texto);
      } catch (e) {
        fallo(e);
      }
    },
    // V57: borrar un interesado (solo el Titular).
    async borrarInteresado(x) {
      try {
        const { data, error: e } = await supabase.from("est_interesados").delete().eq("id", x.id).select("id");
        if (e) throw e;
        if (!data?.length) {
          avisar("No se pudo borrar ese interesado.");
          return false;
        }
        await log(null, `Borró un interesado: ${x.nombre}`, x.curso || null, "Borrado");
        local((d) => ({ ...d, interesados: d.interesados.filter((y) => y.id !== x.id) }));
        avisar("Interesado borrado");
        return true;
      } catch (e) {
        fallo(e);
        return false;
      }
    },
    // V57: la dirección (por 10 minutos) de una foto, para verla en la ficha.
    async urlArchivo(ruta) {
      const { data } = await supabase.storage.from("estudiantes-docs").createSignedUrl(ruta, 600);
      return data?.signedUrl || "";
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

  // V55: Cursos al lado de Inicio ("pon cursos al lado de inicio").
  const links = [
    { r: "inicio", t: "Inicio" },
    { r: "cursos", t: "Cursos" },
    { r: "estudiantes", t: "Estudiantes" },
    // V59 ("161"): Calendario entre Estudiantes e Interesados.
    { r: "calendario", t: "Calendario" },
    ...(p.interesados ? [{ r: "interesados", t: "Interesados" }] : []),
    { r: "mas", t: "Más" },
  ];
  const activo = ruta === "estudiantes" || ruta.startsWith("estudiante:") || ruta.startsWith("nuevo") ? "estudiantes" : ["bitacora", "estadisticas", "administracion", "basedatos", "notificaciones"].includes(ruta) ? "mas" : ruta.startsWith("curso:") ? "cursos" : ruta.split(":")[0];
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
  else if (ruta === "estudiantes") cuerpo = <Directorio {...q} />;
  else if (ruta === "cursos") cuerpo = <Lista key={ruta} {...q} />;
  // V68 ("17. A"): un cuadro de Inicio abre los estudiantes de esa etapa.
  else if (ruta.startsWith("cursos:")) cuerpo = <PorEtapa key={ruta} {...q} etapa={ruta.split(":")[1]} />;
  else if (ruta.startsWith("estudiante:")) {
    const id = ruta.split(":")[1];
    cuerpo = db.estudiantes.some((x) => x.id === id) ? <Ficha key={id} {...q} id={id} /> : <div className="hint-text">Ese estudiante no existe.</div>;
  } else if (ruta === "nuevo" || ruta.startsWith("nuevo:")) cuerpo = p.estudiantes ? <Nuevo {...q} interesadoId={ruta.split(":")[1] || null} /> : <Inicio {...q} />;
  else if (ruta.startsWith("curso:")) cuerpo = <DetalleCurso {...q} fechaId={ruta.split(":")[1]} />;
  else if (ruta === "calendario") cuerpo = <Calendario {...q} />;
  else if (ruta === "interesados") cuerpo = p.interesados ? <Interesados {...q} /> : <Inicio {...q} />;
  else if (ruta === "basedatos") cuerpo = <Cursos {...q} />;
  else if (ruta === "mas") cuerpo = <Mas {...q} />;
  else if (ruta === "bitacora") cuerpo = p.bitacora ? <Bitacora {...q} /> : <Inicio {...q} />;
  // V67 ("4"): Más › Estadísticas, con su permiso.
  else if (ruta === "estadisticas") cuerpo = p.estadisticas ? <Estadisticas {...q} /> : <Inicio {...q} />;
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
