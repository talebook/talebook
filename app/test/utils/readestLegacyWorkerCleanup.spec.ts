import { describe, expect, it, vi } from 'vitest';
import {
    cleanupLegacyReadestWorker,
    recoverStaleNuxtPage,
} from '../../public/readest/legacy-worker-cleanup.js';

const legacyWorker = { scriptURL: 'http://127.0.0.1:9000/readest/sw.js' };

describe('legacy Readest service worker cleanup', () => {
    it('does nothing when no legacy Readest worker exists', async () => {
        const unregister = vi.fn();
        const cacheStorage = {
            keys: vi.fn().mockResolvedValue(['offline-cache']),
            delete: vi.fn(),
        };
        const reload = vi.fn();

        const cleaned = await cleanupLegacyReadestWorker({
            serviceWorker: {
                controller: null,
                getRegistrations: vi.fn().mockResolvedValue([{
                    active: { scriptURL: 'http://127.0.0.1:9000/other-sw.js' },
                    unregister,
                }]),
            },
            cacheStorage,
            reload,
        });

        expect(cleaned).toBe(false);
        expect(unregister).not.toHaveBeenCalled();
        expect(cacheStorage.keys).not.toHaveBeenCalled();
        expect(reload).not.toHaveBeenCalled();
    });

    it('removes caches recreated during the final recovery navigation', async () => {
        const cacheStorage = {
            keys: vi.fn().mockResolvedValue(['offline-cache', 'talebook-owned-cache']),
            delete: vi.fn().mockResolvedValue(true),
        };
        const reload = vi.fn();

        const cleaned = await cleanupLegacyReadestWorker({
            serviceWorker: {
                controller: null,
                getRegistrations: vi.fn().mockResolvedValue([]),
            },
            cacheStorage,
            reload,
            forceCacheCleanup: true,
        });

        expect(cleaned).toBe(true);
        expect(cacheStorage.delete).toHaveBeenCalledOnce();
        expect(cacheStorage.delete).toHaveBeenCalledWith('offline-cache');
        expect(reload).not.toHaveBeenCalled();
    });

    it('unregisters the legacy worker, removes its caches, and reloads a controlled page', async () => {
        const unregister = vi.fn().mockResolvedValue(true);
        const cacheStorage = {
            keys: vi.fn().mockResolvedValue([
                'serwist-precache-v2-http://127.0.0.1:9000/',
                'client-pages',
                'offline-cache',
                'fonts-cache',
                'talebook-owned-cache',
            ]),
            delete: vi.fn().mockResolvedValue(true),
        };
        const reload = vi.fn();

        const cleaned = await cleanupLegacyReadestWorker({
            serviceWorker: {
                controller: legacyWorker,
                getRegistrations: vi.fn().mockResolvedValue([{
                    active: legacyWorker,
                    unregister,
                }]),
            },
            cacheStorage,
            reload,
        });

        expect(cleaned).toBe(true);
        expect(unregister).toHaveBeenCalledOnce();
        expect(cacheStorage.delete.mock.calls.map(([name]) => name)).toEqual([
            'serwist-precache-v2-http://127.0.0.1:9000/',
            'client-pages',
            'offline-cache',
            'fonts-cache',
        ]);
        expect(reload).toHaveBeenCalledOnce();
    });

    it('cleans up and replaces a stale page with a cache-busting URL once', async () => {
        const cleanup = vi.fn().mockRejectedValue(new Error('locked cache'));
        const location = {
            href: 'http://127.0.0.1:9000/book/131?reader=readest#details',
            replace: vi.fn(),
        };
        const recoveryState = {};

        const recovered = await recoverStaleNuxtPage({
            cleanup,
            location,
            now: () => 123,
            recoveryState,
        });
        const recoveredAgain = await recoverStaleNuxtPage({
            cleanup,
            location,
            now: () => 456,
            recoveryState,
        });

        expect(recovered).toBe(true);
        expect(recoveredAgain).toBe(false);
        expect(cleanup).toHaveBeenCalledOnce();
        expect(cleanup).toHaveBeenCalledWith({ reload: expect.any(Function) });
        expect(location.replace).toHaveBeenCalledWith(
            'http://127.0.0.1:9000/book/131?reader=readest&__talebook_recovery=123#details',
        );
    });

    it('does not loop when the page already has the recovery marker', async () => {
        const cleanup = vi.fn();
        const location = {
            href: 'http://127.0.0.1:9000/book/131?__talebook_recovery=123',
            replace: vi.fn(),
        };

        const recovered = await recoverStaleNuxtPage({ cleanup, location, recoveryState: {} });

        expect(recovered).toBe(false);
        expect(cleanup).not.toHaveBeenCalled();
        expect(location.replace).not.toHaveBeenCalled();
    });
});
