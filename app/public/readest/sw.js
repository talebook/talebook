// Remove the root-scoped service worker shipped by older Talebook embeds.
const LEGACY_CACHE_NAMES = new Set(['client-pages', 'offline-cache', 'fonts-cache']);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    const staleCacheNames = cacheNames.filter(
      (name) => name.startsWith('serwist-') || LEGACY_CACHE_NAMES.has(name),
    );
    await Promise.all(staleCacheNames.map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await clients.matchAll({ type: 'window' });
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});
