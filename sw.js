/**
 * The offline shell.
 *
 * The game is a single page with no server behind it: once the script and the
 * stylesheet are on the device there is nothing else to fetch, and the save
 * lives in local storage. So it can run with no network at all, and this is
 * what makes it do so — which is also what a wrapped Android build needs,
 * because a WebView that is waiting on the network to show a game it already
 * has is a game that appears to be broken.
 *
 * Deliberately small. No route table, no versioned asset manifest to drift out
 * of step with the build: the shell is cached the first time it is fetched and
 * the network is preferred whenever it is there, so a new deploy is picked up
 * on the next load rather than pinned until somebody clears their storage.
 *
 * Everything is relative. The game is served from a project sub-path on GitHub
 * Pages, so an absolute '/index.html' would point at the wrong thing.
 */

const CACHE = 'business-manager-shell-v1';

self.addEventListener('install', (event) => {
  // Nothing is pre-cached by name. The build hashes its filenames and this
  // file would be the one place that had to be told about it — so instead the
  // shell fills itself from the first successful load.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only ever this origin. Anything else is somebody else's to cache.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        // Only whole, ordinary responses go in the cache: a partial or an
        // error page cached as the shell is a game that opens broken for ever.
        if (fresh && fresh.status === 200 && fresh.type === 'basic') {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        // A navigation with nothing cached for that exact URL still wants the
        // page, because this is a one-page game and every route is that page.
        if (request.mode === 'navigate') {
          const shell = await caches.match('./index.html');
          if (shell) return shell;
        }
        throw new Error('offline and nothing cached');
      }
    })(),
  );
});
