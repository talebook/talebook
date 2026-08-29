// Remove the root-scoped service worker shipped by older Talebook embeds.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.filter((name) => name.startsWith('serwist-')).map((name) => caches.delete(name)));
    await self.registration.unregister();
    const windows = await clients.matchAll({ type: 'window' });
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});
