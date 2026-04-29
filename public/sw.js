/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-optional-chain */

// Minimal service worker for Web Push.
// Intentionally does NOT implement offline caching.

const sw = /** @type {any} */ (self);

/** @param {any} event */
const handlePush = (event) => {
  const e = /** @type {any} */ (event);
  if (!e.data) return;

  let payload = null;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "LaunchThatBot", body: e.data.text() };
  }

  const title = payload && payload.title ? String(payload.title) : "LaunchThatBot";
  const body = payload && payload.body ? String(payload.body) : "";
  const icon = payload && payload.icon ? String(payload.icon) : "/icon-192x192.png";
  const badge = payload && payload.badge ? String(payload.badge) : "/icon-192x192.png";
  const url = payload && payload.url ? String(payload.url) : "/";
  const notificationId =
    payload && payload.data && payload.data.notificationId
      ? String(payload.data.notificationId)
      : "";

  e.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url, notificationId },
    }),
  );
};

/** @param {any} event */
const handleNotificationClick = (event) => {
  const e = /** @type {any} */ (event);
  e.notification.close();
  const data = e.notification && e.notification.data ? e.notification.data : {};
  const url = data && data.url ? String(data.url) : "/";
  const notificationId = data && data.notificationId ? String(data.notificationId) : "";

  e.waitUntil(
    (async () => {
      let urlWithId = url;
      try {
        const u = new URL(url, String(sw.location.origin));
        if (notificationId) u.searchParams.set("__n", notificationId);
        urlWithId = u.toString();
      } catch {
        // keep raw URL
      }

      const allClients = await sw.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        if ("focus" in client) {
          client.postMessage({
            kind: "notificationClick",
            url,
            notificationId,
            channel: "push",
            eventType: "clicked",
          });
          try {
            const win = client;
            if (notificationId && "navigate" in win && typeof win.navigate === "function") {
              await win.focus();
              await win.navigate(urlWithId);
              return;
            }
          } catch {
            // ignore and fallback to focus
          }
          await client.focus();
          return;
        }
      }

      try {
        await sw.clients.openWindow(urlWithId);
      } catch {
        await sw.clients.openWindow(url);
      }
    })(),
  );
};

sw.addEventListener("push", handlePush);
sw.addEventListener("notificationclick", handleNotificationClick);
