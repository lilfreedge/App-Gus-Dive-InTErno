"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConInfo from "@/components/ConInfo";
import { IconLink } from "@/components/icons";

// V31 — Administración › Roles (migration_61.sql), uno por app.
//
// Pedido del usuario: "Creame una seccion en administracion para crear
// roles y yo poner cuales seran sus accesos. para futuros roles".
// Acordado: cada app tiene sus propios roles; el único que cubre las dos es
// Administrador; el rol manda (quien lo tiene tiene exactamente esos
// accesos); cambiar un rol cambia a todos los que lo tienen (lo hace la
// base de datos); editar y anular siguen siendo solo de Administrador, por
// eso esas casillas no salen aquí.
//
// V32 (pedido explícito: "permíteme poder borrar y editar roles en ambos
// apps"; maqueta aprobada):
// - "Borrar rol" al abrir un rol: solo si nadie lo tiene (si alguien lo
//   tiene, avisa quiénes); si nadie, pide confirmar. La base de datos lo
//   vuelve a revisar (migration_64.sql). Administrador no es un rol de
//   esta lista: no se puede borrar ni cambiar.
// - El texto de explicación pasa al botón ⓘ junto a "Roles" (sin la frase
//   "Los roles no se borran").
// - Solo se ve el botón "+ Crear rol"; el nombre se pide al tocarlo.
//
// `secciones`: la misma lista de Usuarios y permisos de esa app.
// `opcionesInicio` (V34; antes `conInicio`, solo App Interno): las
// opciones de "Pantalla de inicio" del rol en esta app --
// [{ valor, label, ayuda }]. App Interno: Normal / Solo llenados (el
// operario) / Equipos (para rol técnico). App Equipos de clientes: Normal /
// Mis órdenes asignadas (el técnico).
//
// `rolesOtraApp` (V34, roles vinculados -- pedido explícito: "Debe de haber
// una manera de que esos roles estén vinculados a través de ambos
// espacios"; maqueta-v34-4.html): los roles de la otra app, para "Vinculado
// con". Al ponerle un rol vinculado a alguien se le pone también el otro
// (lo hace la base de datos, migration_66.sql).
export default function RolesAdmin({ app, roles, secciones, perfiles = [], opcionesInicio = [], rolesOtraApp = [] }) {
  const otraApp = app === "interno" ? "App Equipos de clientes" : "App Interno";
  const conInicio = opcionesInicio.length > 0;
  const router = useRouter();
  const supabase = createClient();
  const [abierto, setAbierto] = useState(null);
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nombres, setNombres] = useState({});
  const [creandoAbierto, setCreandoAbierto] = useState(false);
  // Rol que se está por borrar: { rol, gente: [nombres] }.
  const [borrando, setBorrando] = useState(null);

  const seccionesRol = secciones
    .map((s) => ({ ...s, items: s.items.filter((it) => !it.soloAdmin && !s.soloAdmin) }))
    .filter((s) => s.items.length > 0);
  const claves = seccionesRol.flatMap((s) => s.items.map((i) => i.clave));
  const campoRol = app === "interno" ? "rol_interno_id" : "rol_clientes_id";

  function mensaje(err) {
    if (!err) return "";
    if (String(err.message || "").toLowerCase().includes("duplicate")) return "Ya existe un rol con ese nombre.";
    return err.message || "No se pudo guardar.";
  }

  async function actualizar(rol, cambios) {
    setGuardando(rol.id);
    setError("");
    const { error: err } = await supabase.from("roles_app").update(cambios).eq("id", rol.id);
    setGuardando(null);
    if (err) setError(mensaje(err));
    router.refresh();
  }

  async function vincular(rol, otroId) {
    setGuardando(rol.id);
    setError("");
    const { error: err } = await supabase.rpc("vincular_rol", { p_rol: rol.id, p_otro: otroId || null });
    setGuardando(null);
    if (err) setError(mensaje(err));
    router.refresh();
  }

  async function crear(e) {
    e.preventDefault();
    const nombre = nombreNuevo.trim();
    if (!nombre) return setError("Escribe el nombre del rol.");
    setGuardando("nuevo");
    setError("");
    const permisos = Object.fromEntries(claves.map((c) => [c, false]));
    const { data, error: err } = await supabase
      .from("roles_app")
      .insert({ app, nombre, permisos })
      .select("id")
      .single();
    setGuardando(null);
    if (err) return setError(mensaje(err));
    setNombreNuevo("");
    setCreandoAbierto(false);
    setAbierto(data?.id || null);
    router.refresh();
  }

  function genteConRol(rol) {
    return perfiles.filter((p) => p[campoRol] === rol.id && !p.is_admin && !p.es_titular);
  }

  function pedirBorrar(rol) {
    setError("");
    setBorrando({ rol, gente: genteConRol(rol).map((p) => p.full_name || "Sin nombre") });
  }

  async function borrar() {
    if (!borrando || borrando.gente.length > 0) return;
    setGuardando(borrando.rol.id);
    setError("");
    const { error: err } = await supabase.from("roles_app").delete().eq("id", borrando.rol.id);
    setGuardando(null);
    if (err) {
      setBorrando(null);
      return setError(err.message || "No se pudo borrar el rol.");
    }
    setBorrando(null);
    setAbierto(null);
    router.refresh();
  }

  function permisosDe(rol) {
    return { ...Object.fromEntries(claves.map((c) => [c, false])), ...(rol.permisos || {}) };
  }

  return (
    <div>
      <ConInfo
        style={{ marginBottom: 10 }}
        texto={`Crea un rol con su nombre y sus accesos, y después asígnaselo a cada persona en ${
          app === "interno" ? "Usuarios y permisos" : "Permisos"
        }. Quien tiene un rol tiene exactamente esos accesos. Si cambias un rol, cambia para todos los que lo tienen. Editar y anular registros sigue siendo solo de Administrador.`}
      >
        <div style={{ fontWeight: 700, color: "var(--azul-texto)", fontSize: 14.5 }}>Roles</div>
      </ConInfo>

      {error && <div className="error-box" style={{ marginTop: 0, marginBottom: 10 }}>{error}</div>}

      <div className="card" style={{ padding: "4px 16px" }}>
        {roles.length === 0 && <div className="empty">Todavía no hay roles creados en esta app.</div>}
        {roles.map((rol) => {
          const estaAbierto = abierto === rol.id;
          const permisos = permisosDe(rol);
          const cuantos = claves.filter((c) => permisos[c]).length;
          const gente = genteConRol(rol).length;
          const nombreEditado = nombres[rol.id] ?? rol.nombre;
          return (
            <div key={rol.id} className="list-item">
              <div
                className="list-item-top"
                onClick={() => setAbierto(estaAbierto ? null : rol.id)}
                style={{ cursor: "pointer" }}
              >
                <span className="list-item-title">
                  {rol.nombre}
                  {rol.vinculado_id && (
                    <span className="hint-text" style={{ margin: "0 0 0 8px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      ↔ {otraApp}
                    </span>
                  )}
                </span>
                <span className="hint-text" style={{ margin: 0, whiteSpace: "nowrap" }}>
                  {conInicio && rol.inicio && rol.inicio !== "normal"
                    ? `Inicio: ${(opcionesInicio.find((o) => o.valor === rol.inicio)?.corto || rol.inicio)} · `
                    : ""}
                  {cuantos} acceso{cuantos === 1 ? "" : "s"} · {gente} persona{gente === 1 ? "" : "s"}
                  <span style={{ marginLeft: 6 }}>{estaAbierto ? "▴" : "▾"}</span>
                </span>
              </div>

              {estaAbierto && (
                <div style={{ marginTop: 10 }}>
                  <label style={{ marginTop: 0 }}>Nombre del rol</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombres((n) => ({ ...n, [rol.id]: e.target.value }))}
                      style={{ marginTop: 0, flex: 1, minWidth: 0 }}
                    />
                    {nombreEditado.trim() !== rol.nombre && (
                      <button
                        type="button"
                        className="btn secondary"
                        disabled={guardando === rol.id || !nombreEditado.trim()}
                        onClick={() => actualizar(rol, { nombre: nombreEditado.trim() })}
                        style={{ marginTop: 0, width: "auto" }}
                      >
                        Renombrar
                      </button>
                    )}
                  </div>

                  {conInicio && (
                    <>
                      <label>Pantalla de inicio</label>
                      <select
                        value={rol.inicio || "normal"}
                        disabled={guardando === rol.id}
                        onChange={(e) => actualizar(rol, { inicio: e.target.value })}
                      >
                        {opcionesInicio.map((o) => (
                          <option key={o.valor} value={o.valor}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {opcionesInicio.find((o) => o.valor === (rol.inicio || "normal"))?.ayuda && (
                        <div className="hint-text" style={{ marginTop: 4 }}>
                          {opcionesInicio.find((o) => o.valor === (rol.inicio || "normal")).ayuda}
                        </div>
                      )}
                    </>
                  )}

                  {/* V34 -- Vinculado con (maqueta-v34-4.html). */}
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconLink size={14} /> Vinculado con
                  </label>
                  <select
                    value={rol.vinculado_id || ""}
                    disabled={guardando === rol.id}
                    onChange={(e) => vincular(rol, e.target.value)}
                  >
                    <option value="">Ninguno</option>
                    {rolesOtraApp.map((o) => (
                      <option key={o.id} value={o.id}>
                        {otraApp} › {o.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="hint-text" style={{ marginTop: 4 }}>
                    {rol.vinculado_id
                      ? `Al ponerle este rol a alguien, también se le pone "${
                          rolesOtraApp.find((o) => o.id === rol.vinculado_id)?.nombre || "el otro"
                        }" en ${otraApp}. Al quitárselo, se le quita en las dos. Para entrar a cada app igual hace falta su acceso en Accesos a apps.`
                      : `Si lo vinculas con un rol de ${otraApp}, al ponérselo a alguien se le pone en las dos apps.`}
                  </div>

                  {seccionesRol.map((sec) => (
                    <div key={sec.titulo}>
                      <div className="section-title" style={{ marginTop: 16, marginBottom: 2, fontSize: 14 }}>
                        {sec.titulo}
                      </div>
                      {sec.items.map((it) => {
                        const fijo = conInicio && rol.inicio === "llenados" && it.clave === "registrar_llenado";
                        const activo = fijo || !!permisos[it.clave];
                        return (
                          <label
                            key={it.clave}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 10,
                              padding: "9px 0",
                              paddingLeft: it.sub_de ? 22 : 0,
                              borderBottom: "1px solid var(--borde)",
                              margin: 0,
                              fontWeight: 500,
                              fontSize: 13.5,
                              color: "var(--texto)",
                              cursor: fijo ? "default" : "pointer",
                            }}
                          >
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {it.Icono && <it.Icono size={15} style={{ color: "var(--texto-suave)", flexShrink: 0 }} />}
                              <span>
                                {it.label}
                                {it.sub && (
                                  <span className="hint-text" style={{ display: "block", marginTop: 1 }}>
                                    {it.sub}
                                  </span>
                                )}
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              checked={activo}
                              disabled={fijo || guardando === rol.id}
                              onChange={(e) =>
                                actualizar(rol, { permisos: { ...permisos, [it.clave]: e.target.checked } })
                              }
                              style={{ width: 18, height: 18, flexShrink: 0 }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  ))}

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                    <button
                      type="button"
                      className="btn secondary"
                      disabled={guardando === rol.id}
                      onClick={() => pedirBorrar(rol)}
                      style={{ marginTop: 0, width: "auto", color: "var(--rojo)", borderColor: "var(--rojo)" }}
                    >
                      Borrar rol
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {borrando && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBorrando(null);
          }}
        >
          <div className="modal-panel">
            {borrando.gente.length > 0 ? (
              <>
                <div className="modal-title">No se puede borrar &quot;{borrando.rol.nombre}&quot;</div>
                <div className="error-box" style={{ marginTop: 10 }}>
                  Lo tiene{borrando.gente.length === 1 ? "" : "n"} {borrando.gente.length} persona
                  {borrando.gente.length === 1 ? "" : "s"} ({borrando.gente.join(", ")}). Cámbia
                  {borrando.gente.length === 1 ? "la" : "las"} de rol primero en{" "}
                  {app === "interno" ? "Usuarios y permisos" : "Permisos"}.
                </div>
                <div className="modal-actions">
                  <button className="btn secondary" type="button" onClick={() => setBorrando(null)}>
                    Entendido
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-title">¿Borrar el rol &quot;{borrando.rol.nombre}&quot;?</div>
                <div style={{ fontSize: 13.5, marginTop: 8, color: "var(--texto-suave)" }}>
                  Nadie lo tiene. Esto no se puede deshacer.
                </div>
                <div className="modal-actions">
                  <button className="btn secondary" type="button" onClick={() => setBorrando(null)} disabled={guardando === borrando.rol.id}>
                    Cancelar
                  </button>
                  <button className="btn danger" type="button" onClick={borrar} disabled={guardando === borrando.rol.id}>
                    {guardando === borrando.rol.id ? "Borrando..." : "Borrar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {creandoAbierto ? (
        <form onSubmit={crear} style={{ marginTop: 12 }}>
          <label style={{ marginTop: 0 }}>Nombre del rol nuevo</label>
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Ej. Técnico"
            autoFocus
            style={{ marginTop: 0 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
            <button className="btn btn-primary" type="submit" disabled={guardando === "nuevo"} style={{ marginTop: 0, width: "auto" }}>
              {guardando === "nuevo" ? "Creando..." : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreandoAbierto(false);
                setNombreNuevo("");
                setError("");
              }}
              style={{ background: "none", border: "none", color: "var(--texto-suave)", cursor: "pointer", fontSize: 13, padding: 0 }}
            >
              Cancelar ✕
            </button>
          </div>
        </form>
      ) : (
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            setError("");
            setCreandoAbierto(true);
          }}
          style={{ marginTop: 12, width: "auto" }}
        >
          + Crear rol
        </button>
      )}
    </div>
  );
}
