const LEGACY_WORKER_PATH = '/readest/sw.js';
const LEGACY_CACHE_NAMES = new Set(['client-pages', 'offline-cache', 'fonts-cache']);

function isLegacyReadestWorker(worker) {
  if (!worker?.scriptURL) return false;
  try {
    return new URL(worker.scriptURL).pathname === LEGACY_WORKER_PATH;
  } catch {
    return false;
  }
}

function isLegacyReadestRegistration(registration) {
  return [registration.installing, registration.waiting, registration.active].some(isLegacyReadestWorker);
}

export async function cleanupLegacyReadestWorker({
  serviceWorker = globalThis.navigator?.serviceWorker,
  cacheStorage = globalThis.caches,
  reload = () => globalThis.location.reload(),
} = {}) {
  if (!serviceWorker?.getRegistrations) return false;

  const registrations = await serviceWorker.getRegistrations();
  const legacyRegistrations = registrations.filter(isLegacyReadestRegistration);
  const controlledByLegacyWorker = isLegacyReadestWorker(serviceWorker.controller);
  if (!legacyRegistrations.length && !controlledByLegacyWorker) return false;

  await Promise.all(legacyRegistrations.map(registration => registration.unregister()));
  if (cacheStorage?.keys) {
    const cacheNames = await cacheStorage.keys();
    await Promise.all(
      cacheNames
        .filter(name => name.startsWith('serwist-') || LEGACY_CACHE_NAMES.has(name))
        .map(name => cacheStorage.delete(name)),
    );
  }

  if (controlledByLegacyWorker) reload();
  return true;
}

if (typeof window !== 'undefined') {
  void cleanupLegacyReadestWorker().catch(() => {});
}
