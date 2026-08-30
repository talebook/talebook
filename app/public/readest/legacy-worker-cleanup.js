const LEGACY_WORKER_PATH = '/readest/sw.js';
const LEGACY_CACHE_NAMES = new Set(['client-pages', 'offline-cache', 'fonts-cache']);
const RECOVERY_QUERY_PARAM = '__talebook_recovery';
const RECOVERY_STATE_KEY = '__talebookNuxtRecoveryStarted';
const LOADED_FOR_STALE_RECOVERY = new URL(import.meta.url).searchParams.has('stale-recovery');

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
  forceCacheCleanup = false,
} = {}) {
  if (!serviceWorker?.getRegistrations) return false;

  const registrations = await serviceWorker.getRegistrations();
  const legacyRegistrations = registrations.filter(isLegacyReadestRegistration);
  const controlledByLegacyWorker = isLegacyReadestWorker(serviceWorker.controller);
  if (!legacyRegistrations.length && !controlledByLegacyWorker && !forceCacheCleanup) return false;

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

export async function recoverStaleNuxtPage({
  cleanup = cleanupLegacyReadestWorker,
  location = globalThis.location,
  now = Date.now,
  recoveryState = globalThis,
} = {}) {
  if (!location?.href || !location?.replace) return false;

  const target = new URL(location.href);
  if (target.searchParams.has(RECOVERY_QUERY_PARAM) || recoveryState[RECOVERY_STATE_KEY]) return false;
  recoveryState[RECOVERY_STATE_KEY] = true;

  try {
    await cleanup({ reload: () => {} });
  } catch {
    // A cache deletion failure must not prevent an HTTP-cache recovery reload.
  }

  target.searchParams.set(RECOVERY_QUERY_PARAM, String(now()));
  location.replace(target.href);
  return true;
}

if (typeof window !== 'undefined' && !LOADED_FOR_STALE_RECOVERY) {
  const resumedStaleRecovery = new URL(globalThis.location.href).searchParams.has(RECOVERY_QUERY_PARAM);
  void cleanupLegacyReadestWorker({ forceCacheCleanup: resumedStaleRecovery }).catch(() => {});
}
