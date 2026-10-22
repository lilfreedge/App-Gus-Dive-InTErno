// V32 -- Envíos de NUESTROS tanques a prueba hidrostática (tabla
// envios_hidrostatica, migration_63.sql). Pedido explícito: "necesitamos
// crear algo similar a las PH del app equipo clientes, para los tanques de
// nosotros. saber cuándo se enviaron y qué tiempo tienen. esto no tiene que
// figurar en inicio, solo en esta sección".

// Colores de los días afuera (aprobado: azul hasta 15, ámbar de 16 a 30,
// rojo más de 30).
export function claseDiasAfuera(dias) {
  if (dias > 30) return "badge-rojo";
  if (dias > 15) return "badge-amarillo";
  return "badge-azul";
}

export function diasEntreFechas(desdeISO, hastaISO) {
  if (!desdeISO || !hastaISO) return 0;
  const a = Date.UTC(...desdeISO.slice(0, 10).split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  const b = Date.UTC(...hastaISO.slice(0, 10).split("-").map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
  return Math.max(0, Math.round((b - a) / 86400000));
}

// Envíos abiertos (tanques que están afuera ahora mismo). Si la tabla
// todavía no existe (migration_63.sql sin correr) devuelve [] en vez de
// romper la pantalla.
export async function enviosAbiertos(supabase) {
  const { data, error } = await supabase
    .from("envios_hidrostatica")
    .select("id, tanque_id, tanque_codigo_snapshot, fecha_envio, nota, user_id, nombre_usuario_snapshot, created_at")
    .is("fecha_regreso", null)
    .order("fecha_envio", { ascending: true });
  if (error) return [];
  return data || [];
}

// Solo los ids de los tanques que están afuera -- para sacarlos de
// "pendientes" y del aviso de Inicio (ya se están atendiendo).
export async function idsTanquesAfuera(supabase) {
  const envios = await enviosAbiertos(supabase);
  return envios.map((e) => e.tanque_id);
}
