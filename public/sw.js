// CACHE_VERSION bump forces old service workers to uninstall on next visit.
// This SW intentionally does NOT intercept fetch requests — pages always load
// fresh from the network. Caching is left to the browser HTTP cache. This
// avoids the class of bugs where a cached offline fallback is incorrectly
// served to online users.
const CACHE_VERSION = "rosterly-v3";

self.addEventListener("install", () => {
  // Skip waiting so this SW activates immediately and replaces any old SW that
  // was incorrectly serving the offline page as a navigation fallback.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Delete ALL old caches (rosterly-v1, rosterly-v2, etc.)
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Push notification handler — the only fetch-related feature we keep.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "Rosterly reminder", body: "You have a new reminder.", url: "/" };
  try {
    payload = { ...payload, ...event.data.json() };
  } catch {
    // Fall back to defaults if payload is malformed.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192.svg",
      badge: "/icons/icon-192.svg",
      data: { url: payload.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.includes(self.location.origin)) {
          client.navigate(destination);
          return client.focus();
        }
      }
      return self.clients.openWindow(destination);
    }),
  );
});
