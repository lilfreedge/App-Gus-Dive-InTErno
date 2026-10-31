import { Resend } from "resend";
import webpush from "web-push";
import { llavesPush } from "./viajes/avisos";
import { destinatarios, ultimaVez, OCURRENCIA_FIJO } from "./avisos-fijos";
import { hoyISO } from "./fechas";

// V51 -- Cuando alguien toca "Listo" en un aviso fijo, le llega al que lo
// creó al celular y por correo ("16. las dos"). Solo servidor (llave de
// servicio). El celular usa las mismas notificaciones de Buceos: le llegan
// si ya las activó en ese celular o computadora. Nunca hace fallar el
// "Listo": los errores se anotan en la consola del servidor.

const escapar = (t) =>
  String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const NOMBRE_APP = { interno: "App Interno", clientes: "App Equipos de clientes" };
export const RUTA_ADMIN_AVISOS = { interno: "/admin/avisos", clientes: "/app-clientes/administracion/avisos" };

export async function avisarLeido(s, { avisoId, vez, quienId, quien, origen }) {
  const errores = [];
  try {
    const { data: aviso } = await s.from("avisos_fijos").select("*").eq("id", avisoId).maybeSingle();
    if (!aviso?.creado_por || aviso.creado_por === quienId) return;
    const app = NOMBRE_APP[aviso.app] || "App";
    const ruta = RUTA_ADMIN_AVISOS[aviso.app] || "/";
    const url = origen ? `${origen}${ruta}` : ruta;
    const titulo = `${quien || "Alguien"} leyó tu aviso`;
    const corto = aviso.texto.length > 110 ? `${aviso.texto.slice(0, 107)}…` : aviso.texto;

    // Quién falta (para el correo).
    const [{ data: perfiles }, { data: leidos }] = await Promise.all([
      s.from("profiles").select("id, full_name, es_titular, is_admin, permisos, eliminado_en"),
      s.from("avisos_fijos_leidos").select("user_id").eq("aviso_id", avisoId).eq("ocurrencia", vez),
    ]);
    const ya = new Set((leidos || []).map((l) => l.user_id));
    const faltan = destinatarios(aviso, perfiles || []).filter((p) => !ya.has(p.id)).map((p) => p.full_name || "—");

    const tareas = [];
    // 1) Celular
    tareas.push(
      (async () => {
        const { data: subs } = await s.from("viajes_push").select("id, endpoint, p256dh, auth").eq("user_id", aviso.creado_por);
        if (!subs?.length) return;
        const k = await llavesPush(s);
        webpush.setVapidDetails(origen && origen.startsWith("https:") ? origen : "mailto:avisos@gusdivecenter.com", k.publica, k.privada);
        const carga = JSON.stringify({ title: titulo, body: corto, url: ruta, tag: `aviso-${avisoId}` });
        await Promise.all(
          subs.map((sub) =>
            webpush
              .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, carga, { TTL: 60 * 60 * 24 })
              .catch(async (e) => {
                if (e?.statusCode === 404 || e?.statusCode === 410) await s.from("viajes_push").delete().eq("id", sub.id);
                else errores.push(`cel: ${e?.statusCode || ""} ${e?.message || e}`);
              })
          )
        );
      })()
    );
    // 2) Correo
    if (process.env.RESEND_API_KEY) {
      tareas.push(
        (async () => {
          const { data } = await s.auth.admin.getUserById(aviso.creado_por);
          const to = data?.user?.email;
          if (!to) return;
          const hora = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date());
          const lineaFalta = faltan.length ? `Falta: ${faltan.join(", ")}` : "Ya lo leyeron todos.";
          const text = [`Gus Dive · ${app}`, "", `${quien || "Alguien"} marcó como leído tu aviso:`, "", aviso.texto, "", `${hora} · ${lineaFalta}`, "", `Ver los avisos: ${url}`].join("\n");
          const html = `
            <div style="font-family:sans-serif;color:#1a2733;max-width:520px;">
              <div style="background:#36454f;color:#fff;border-radius:10px 10px 0 0;padding:14px 16px;">
                <div style="font-size:11px;font-weight:bold;letter-spacing:.1em;">GUS DIVE · ${escapar(app.toUpperCase())}</div>
                <div style="font-size:18px;font-weight:bold;margin-top:2px;">${escapar(titulo)}</div>
              </div>
              <div style="border:1px solid #dfe6ea;border-top:none;border-radius:0 0 10px 10px;padding:16px;">
                <p style="margin:0 0 8px;font-size:15px;"><b>${escapar(quien || "Alguien")}</b> marcó como leído tu aviso:</p>
                <div style="margin:0 0 12px;padding:10px 12px;background:#eef2f5;border-radius:8px;font-size:15px;white-space:pre-wrap;">${escapar(aviso.texto)}</div>
                <p style="margin:0 0 14px;font-size:13px;color:#5b6b78;">${escapar(hora)} · ${escapar(lineaFalta)}</p>
                <a href="${escapar(url)}" style="display:inline-block;background:#36454f;color:#fff;text-decoration:none;font-weight:bold;padding:10px 16px;border-radius:8px;">Ver los avisos</a>
              </div>
            </div>`;
          const resend = new Resend(process.env.RESEND_API_KEY);
          const { error } = await resend.emails.send({
            from: process.env.REPORT_EMAIL_FROM || "Gus Dive <onboarding@resend.dev>",
            to,
            subject: `${quien || "Alguien"} leyó tu aviso - ${app}`,
            html,
            text,
          });
          if (error) errores.push(`correo: ${error.message || error.name}`);
        })()
      );
    }
    await Promise.race([Promise.allSettled(tareas), new Promise((r) => setTimeout(r, 8000))]);
  } catch (e) {
    errores.push(String(e?.message || e));
  }
  if (errores.length) console.error("Avisos fijos (Listo):", errores);
}

// La vez que le toca hoy (para la pantalla de Administración).
export function vezDeHoy(aviso) {
  return aviso.tipo === "fijo" ? OCURRENCIA_FIJO : ultimaVez(aviso, hoyISO());
}
