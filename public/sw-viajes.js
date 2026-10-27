// V44 -- Notificaciones de Viajes/Buceos en el celular o la computadora.
// Las manda el servidor (lib/viajes/avisos.js); al tocarla abre el viaje.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(d.title || "Gus Dive · Viajes", {
      body: d.body || "",
      icon: "/icono-app-192.png",
      badge: "/icono-app-192.png",
      tag: d.tag || undefined,
      data: { url: d.url || "/viajes-buceos" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/viajes-buceos";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const w of ventanas) {
        if ("focus" in w) {
          if ("navigate" in w) w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
