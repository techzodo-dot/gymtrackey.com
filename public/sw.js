// Minimal offline shell: cache static assets, never cache authenticated pages or API calls.
const CACHE = "gymtrackey-shell-v1";
const SHELL = ["/offline.html", "/logo.svg"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
});
