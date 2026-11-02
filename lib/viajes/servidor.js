import crypto from "crypto";

// V42 -- Viajes/Buceos, cosas que solo corren en el servidor.

// Token del link del calendario (para Google Calendar). Sale de la llave
// del servidor, así que no hay que configurar nada y nadie lo adivina.
export function tokenCalendario() {
  return crypto
    .createHash("sha256")
    .update(`${process.env.SUPABASE_SERVICE_ROLE_KEY || "sin-llave"}:viajes-calendario`)
    .digest("hex")
    .slice(0, 32);
}

// Datos de la tienda que ve el buzo al inscribirse (pasados por Pipe el
// 26-oct-2026): el WhatsApp de la tienda y las cuentas para transferir. En
// los viajes en pesos solo sale la cuenta en pesos; en los de dólares, las dos.
export const TIENDA = {
  whatsapp: process.env.VIAJES_WHATSAPP_TIENDA || "8095660818",
  titular: "Gustavo Torreira",
  cedula: "001-1922011-9",
  cuentas: [
    { banco: "Banco Popular", tipo: "Cuenta de ahorros", moneda: "DOP", numero: "798639134" },
    { banco: "Banco Popular", tipo: "Cuenta de ahorros", moneda: "USD", numero: "829797133" },
  ],
};

// V59 (165) -- El punto de encuentro ("¿Llegas directo?"): el del buceo si
// lo tiene; si no, el de su buceo del Catálogo (así sirve también para los
// buceos que ya estaban creados).
const tieneEncuentro = (e) => !!(e && (e.hora || e.lugar || e.mapa || e.foto));
export async function encuentroDe(s, fila, v) {
  if (tieneEncuentro(v.encuentro)) return v.encuentro;
  if (!fila.catalogo_id) return null;
  const { data } = await s.from("viajes_catalogo").select("datos").eq("id", fila.catalogo_id).maybeSingle();
  const e = data?.datos?.encuentro;
  return tieneEncuentro(e) ? e : null;
}
