import webpush from "web-push";
import { llavesPush } from "@/lib/viajes/avisos";

// V84 (maqueta V84, idea c: "Avisos en el celular") -- avisos de cursos y
// buceos nuevos a los clientes que los activaron en el app Gus Dive
// (tabla gus_push, migration_98). Cada aviso sale una sola vez: su clave
// ("curso:<fecha>" o "viaje:<id>") queda en gus_avisos antes de mandarlo.
// Usa las mismas llaves de los avisos del personal (viajes_push_llaves).
// Devuelve { enviados } o { saltado: motivo }.
export async function avisarClientes(s, { clave, titulo, texto, url }, origen) {
  const { error: eClave } = await s.from("gus_avisos").insert({ clave, titulo, texto });
  if (eClave) return { saltado: /duplicate|unique/i.test(eClave.message || "") ? "ya se mandó" : "falta el SQL de la V84" };
  const { data: subs } = await s.from("gus_push").select("id, endpoint, p256dh, auth");
  if (!subs?.length) return { enviados: 0 };
  const k = await llavesPush(s);
  webpush.setVapidDetails(origen && origen.startsWith("https:") ? origen : "mailto:avisos@gusdivecenter.com", k.publica, k.privada);
  const carga = JSON.stringify({ title: titulo, body: texto, url, tag: clave });
  let enviados = 0;
  await Promise.race([
    Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, carga, { TTL: 60 * 60 * 24 * 3 })
          .then(() => (enviados += 1))
          .catch(async (e) => {
            // 404/410: ese celular ya no los acepta (quitó el permiso o borró el app).
            if (e?.statusCode === 404 || e?.statusCode === 410) await s.from("gus_push").delete().eq("id", sub.id);
          })
      )
    ),
    new Promise((r) => setTimeout(r, 9000)),
  ]);
  await s.from("gus_avisos").update({ enviados }).eq("clave", clave);
  return { enviados };
}
