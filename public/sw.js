const SHELL_CACHE = "rein-shell-v3";
const PRIVATE_CACHE = "rein-private-v3";
const SHELL_URLS = ["/offline", "/manifest.webmanifest", "/rein-logo.png"];

async function offlineNavigationResponse(request) {
  const cached =
    (await caches.match(request, { ignoreVary: true })) ?? (await caches.match("/offline"));
  if (!cached) return Response.error();
  const contentType = cached.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return cached;
  const headers = new Headers(cached.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("x-rein-offline-snapshot", "1");
  const html = (await cached.text()).replace(
    "<head>",
    '<head><meta name="rein-offline-snapshot" content="true"/>',
  );
  return new Response(html, { status: 200, headers });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(
        SHELL_URLS.map(async (url) => {
          const response = await fetch(url, { cache: "reload" });
          if (response.ok) await cache.put(url, response);
        }),
      ),
    ),
  );
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![SHELL_CACHE, PRIVATE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_PRIVATE_CACHE") event.waitUntil(caches.delete(PRIVATE_CACHE));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/settings/data/export"))
    return;
  if (request.mode !== "navigate") {
    if (!["font", "image"].includes(request.destination)) return;
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (!response.ok) return response;
            const copy = response.clone();
            return caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put(request, copy))
              .then(() => response);
          }),
      ),
    );
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response.ok &&
          !url.pathname.startsWith("/login") &&
          !url.pathname.startsWith("/auth")
        ) {
          const copy = response.clone();
          return caches
            .open(PRIVATE_CACHE)
            .then((cache) => cache.put(request, copy))
            .then(() => response);
        }
        return response;
      })
      .catch(() => offlineNavigationResponse(request)),
  );
});
