import { Resend } from "resend";
import webpush from "web-push";
import { correoAviso, correoAvisoTexto } from "./avisos-correo";

// V44 -- Avisos de Viajes (migration_72.sql). Solo servidor: usa la llave
// de servicio, Resend y las llaves push. Pedido explícito: "busca la
// manera de que aparezca una notificación cuando se inscriba una persona
// en un viaje" ... "que puedan ser las diferentes vías, y que yo pueda
// controlarlo, a quién le llega notificaciones y cuáles".
//
// Nunca hace fallar lo que lo llamó (la inscripción ya quedó guardada):
// cualquier error se anota en la consola del servidor y sigue.

// Llaves de las notificaciones push: se generan solas la primera vez y
// quedan en la base (tabla sin acceso para el app).
export async function llavesPush(s) {
  const { data } = await s.from("viajes_push_llaves").select("publica, privada").eq("id", true).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  await s.from("viajes_push_llaves").insert({ id: true, publica: k.publicKey, privada: k.privateKey });
  const { data: otra } = await s.from("viajes_push_llaves").select("publica, privada").eq("id", true).maybeSingle();
  return otra || { publica: k.publicKey, privada: k.privateKey };
}

// evento: "inscripcion" | "comprobante" | "lleno"
// aviso: { titulo, texto, viajeId, ruta (ej. /viajes-buceos/viaje/<id>) }
// origen: https://app-gus-dive-in-t-erno.vercel.app (para los links)
export async function avisar(s, evento, aviso, origen) {
  const resultado = { app: 0, correo: 0, cel: 0, errores: [] };
  try {
    const [{ data: configs }, { data: perfiles }] = await Promise.all([
      s.from("viajes_avisos_config").select("user_id, avisos"),
      s.from("profiles").select("id, full_name, es_titular, permisos, eliminado_en"),
    ]);
    const conAcceso = new Set((perfiles || []).filter((p) => !p.eliminado_en && (p.es_titular || p.permisos?.acceso_viajes)).map((p) => p.id));
    const quienes = (configs || []).filter((c) => conAcceso.has(c.user_id)).map((c) => ({ id: c.user_id, vias: c.avisos?.[evento] || {} }));
    const url = origen && aviso.ruta ? `${origen}${aviso.ruta}` : aviso.ruta || null;
    const tareas = [];

    // 1) En el app (la campanita)
    const app = quienes.filter((q) => q.vias.app);
    if (app.length) {
      tareas.push(
        s
          .from("viajes_notificaciones")
          .insert(app.map((q) => ({ user_id: q.id, evento, titulo: aviso.titulo, texto: aviso.texto || "", viaje_id: aviso.viajeId || null, url: aviso.ruta || null })))
          .then(({ error }) => (error ? resultado.errores.push(`app: ${error.message}`) : (resultado.app = app.length)))
      );
    }

    // 2) Correo (al correo con que entra al app)
    const correo = quienes.filter((q) => q.vias.correo);
    if (correo.length && process.env.RESEND_API_KEY) {
      tareas.push(
        (async () => {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const html = correoAviso({ ...aviso, url, evento });
          const text = correoAvisoTexto({ ...aviso, url, evento });
          for (const q of correo) {
            const { data } = await s.auth.admin.getUserById(q.id);
            const to = data?.user?.email;
            if (!to) continue;
            const { error } = await resend.emails.send({
              from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
              to,
              // V50: en el asunto, " - " en vez de " · " (el punto del medio
              // llegaba dañado, "ዘ", y ayuda a que lo marquen como spam).
              subject: String(aviso.titulo || "").replace(/\s*·\s*/g, " - "),
              html,
              text,
            });
            if (error) resultado.errores.push(`correo ${to}: ${error.message || error.name}`);
            else resultado.correo += 1;
          }
        })()
      );
    }

    // 3) Celular (notificación push)
    const cel = quienes.filter((q) => q.vias.cel);
    if (cel.length) {
      tareas.push(
        (async () => {
          const { data: subs } = await s.from("viajes_push").select("id, endpoint, p256dh, auth").in("user_id", cel.map((q) => q.id));
          if (!subs?.length) return;
          const k = await llavesPush(s);
          webpush.setVapidDetails(origen && origen.startsWith("https:") ? origen : "mailto:avisos@gusdivecenter.com", k.publica, k.privada);
          const carga = JSON.stringify({ title: aviso.titulo, body: aviso.texto || "", url: aviso.ruta || "/viajes-buceos", tag: `${evento}-${aviso.viajeId || ""}` });
          await Promise.all(
            subs.map((sub) =>
              webpush
                .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, carga, { TTL: 60 * 60 * 24 })
                .then(() => (resultado.cel += 1))
                .catch(async (e) => {
                  // 404/410 = ese celular ya no acepta (desinstaló, quitó el permiso): se borra.
                  if (e?.statusCode === 404 || e?.statusCode === 410) await s.from("viajes_push").delete().eq("id", sub.id);
                  else resultado.errores.push(`cel: ${e?.statusCode || ""} ${e?.body || e?.message || e}`);
                })
            )
          );
        })()
      );
    }

    // Que no se quede esperando para siempre (el buzo está esperando su "¡Listo!").
    await Promise.race([Promise.allSettled(tareas), new Promise((r) => setTimeout(r, 8000))]);
  } catch (e) {
    resultado.errores.push(String(e?.message || e));
  }
  if (resultado.errores.length) console.error("Avisos de Viajes:", evento, resultado.errores);
  return resultado;
}
