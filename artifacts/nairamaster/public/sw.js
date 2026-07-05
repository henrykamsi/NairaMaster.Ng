/* NairaMaster.ng Service Worker */
const CACHE_NAME = "nairamaster-v1";
const BASE = self.location.pathname.replace(/\/sw\.js$/, "");

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

/* ── Push Notifications ── */
self.addEventListener("push", (e) => {
  if (!e.data) return;
  let payload;
  try { payload = e.data.json(); } catch { payload = { title: "NairaMaster.ng", body: e.data.text() }; }

  const options = {
    body: payload.body ?? "",
    icon: `${BASE}/favicon.svg`,
    badge: `${BASE}/favicon.svg`,
    vibrate: [200, 100, 200],
    data: { url: payload.url ?? "/" },
    requireInteraction: false,
  };

  e.waitUntil(self.registration.showNotification(payload.title ?? "NairaMaster.ng", options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url ?? "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
