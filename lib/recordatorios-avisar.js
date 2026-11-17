import { Resend } from "resend";
import webpush from "web-push";
import { llavesPush } from "./viajes/avisos";
import { marcoCorreo } from "./correo-formato";

// V63 ("230", recordatorios para técnicos): el aviso le llega solo a la
// persona a la que le toca: en la campanita del App Interno, al celular (si
// activó las notificaciones) y por correo si el recordatorio lo pide. Solo
// servidor (llave de servicio). Nunca hace fallar lo demás.
const escapar = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Anota que ya se avisó (para no repetir). Devuelve false si ya estaba.
async function anotar(s, { recordatorioId, compresorId, para, tipo, userId }) {
  const { error } = await s.from("recordatorios_avisos").insert({ recordatorio_id: recordatorioId, compresor_id: compresorId || null, para, tipo, user_id: userId });
  if (!error) return true;
  // 23505 = ya se había avisado. Si la tabla no existe todavía (falta la
  // migration_91), se avisa igual.
  return error.code !== "23505";
}

export async function avisarRecordatorio(s, { recordatorio, compresorId = null, para, tipo, userId, titulo, texto, url = "/equipos/recordatorios", origen = "" }) {
  const errores = [];
  try {
    if (!(await anotar(s, { recordatorioId: recordatorio.id, compresorId, para, tipo, userId }))) return { repetido: true };
    const tareas = [];
    tareas.push(
      s
        .from("notificaciones")
        .insert({ user_id: userId, app: "interno", titulo, texto, url })
        .then(({ error }) => error && errores.push(`app: ${error.message}`))
    );
    tareas.push(
      (async () => {
        const { data: subs } = await s.from("viajes_push").select("id, endpoint, p256dh, auth").eq("user_id", userId);
        if (!subs?.length) return;
        const k = await llavesPush(s);
        webpush.setVapidDetails(origen && origen.startsWith("https:") ? origen : "mailto:avisos@gusdivecenter.com", k.publica, k.privada);
        const carga = JSON.stringify({ title: titulo, body: texto, url, tag: `rec-${recordatorio.id}-${compresorId || "x"}` });
        await Promise.all(
          subs.map((sub) =>
            webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, carga, { TTL: 60 * 60 * 24 }).catch(async (e) => {
              if (e?.statusCode === 404 || e?.statusCode === 410) await s.from("viajes_push").delete().eq("id", sub.id);
              else errores.push(`cel: ${e?.statusCode || ""} ${e?.message || e}`);
            })
          )
        );
      })()
    );
    if (recordatorio.avisar_correo && process.env.RESEND_API_KEY) {
      tareas.push(
        (async () => {
          const { data } = await s.auth.admin.getUserById(userId);
          const to = data?.user?.email;
          if (!to) return;
          const link = origen ? `${origen}${url}` : url;
          // V98: el marco común de los correos del app (logo y franja grafito).
          const html = marcoCorreo({
            origen,
            app: "interno",
            etiqueta: "GUS DIVE CENTER · APP INTERNO",
            titulo,
            ancho: 520,
            cuerpo: `<p style="margin:0 0 14px;">${escapar(texto)}</p>
<a href="${escapar(link)}" style="display:inline-block;background:#36454f;color:#fff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px;">Ver mis recordatorios</a>`,
          });
          const resend = new Resend(process.env.RESEND_API_KEY);
          const r = await resend.emails.send({ from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>", to, subject: titulo, html, text: `${titulo}\n\n${texto}\n\n${link}` });
          if (r?.error) errores.push(`correo: ${r.error.message || r.error}`);
        })()
      );
    }
    await Promise.all(tareas);
  } catch (e) {
    errores.push(String(e?.message || e));
  }
  if (errores.length) console.error("avisarRecordatorio:", errores.join(" | "));
  return { ok: true, errores };
}
