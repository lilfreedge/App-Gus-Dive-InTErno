import { redirect } from "next/navigation";
import { getProfileYUser, tieneAcceso, esTecnico, conPermisosDefault } from "@/lib/roles";

// V38 -- Menú del técnico (pedido explícito: "vamos a hacer un menú especial
// para el técnico... donde pueda ver todo ahí mismo e interactuar ahí y así
// no tiene que entrar al app... lo más user friendly posible" y "lo que
// quiero es que su menú principal sea diferente y contenga todo lo que le
// corresponde"; maqueta-v38-3.html, opción A, "ya puedes trabajar en el
// código").
//
// Quién lo ve: el rol Técnico. El Titular y los administradores lo pueden
// abrir "como" un técnico (?como=<id>) para ver exactamente lo que le sale
// a él; lo que hagan ahí queda a su propio nombre.
export async function quienEs(supabase, comoId) {
  const { user, profile } = await getProfileYUser(supabase);
  if (!user || !profile) redirect("/login");
  const tecnico = esTecnico(profile);
  const jefe = !!profile.es_titular || !!profile.is_admin;
  if (!tecnico && !jefe) redirect("/espacio");
  if (tecnico) return { user, yo: profile, persona: profile, viendoComo: false };

  const id = /^[0-9a-f-]{36}$/i.test(comoId || "") ? comoId : null;
  if (!id) return { user, yo: profile, persona: null, viendoComo: true };
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return { user, yo: profile, persona: data ? conPermisosDefault(data) : null, viendoComo: true };
}

// Qué le sale en su menú, según sus permisos (si le quitas Compresores o
// Reguladores, esa parte no le sale).
export function accesosDe(persona) {
  const interno = tieneAcceso(persona, "acceso_app_interno");
  const compresores = interno && tieneAcceso(persona, "compresores");
  return {
    ordenes: tieneAcceso(persona, "equipos_clientes"),
    actualizar: tieneAcceso(persona, "equipos_clientes_actualizar_estado"),
    informe: tieneAcceso(persona, "equipos_clientes_informe_mantenimiento"),
    compresores,
    registrarCompresor: compresores && tieneAcceso(persona, "compresor_mantenimiento_registrar"),
    reguladores:
      interno && tieneAcceso(persona, "registrar_mantenimiento") && tieneAcceso(persona, "mantenimiento_registrar"),
  };
}

// "?como=<id>" para que los links internos sigan mostrando el menú de esa
// persona cuando lo está viendo el Titular.
export function sufijoComo(viendoComo, persona) {
  return viendoComo && persona ? `?como=${persona.id}` : "";
}

export function primerNombre(nombre) {
  return String(nombre || "").trim().split(/\s+/)[0] || "";
}

// V40 -- Menú de ⚙ en las pantallas del técnico. Se quitó "Entrar al app
// completo" para el técnico (pedido explícito: "Quita opcion de entrar a
// App completo"); el Titular o un administrador que lo está viendo "como"
// un técnico sí la conserva, para poder volver a su app.
export function enlacesMenu(yo) {
  const lista = [{ href: "/app-clientes/perfil", texto: "Mi perfil" }];
  if (!esTecnico(yo)) lista.push({ href: "/espacio?elegir=1", texto: "Entrar al app completo" });
  return lista;
}
