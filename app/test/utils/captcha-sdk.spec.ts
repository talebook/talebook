import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Turnstile SDK loading', () => {
    it('shares concurrent loading and supports retry after failure', async () => {
        vi.resetModules();
        vi.stubGlobal('turnstile', undefined);
        const scripts: HTMLScriptElement[] = [];
        vi.spyOn(document.head, 'appendChild').mockImplementation((script) => { scripts.push(script as HTMLScriptElement); return script; });
        const { loadTurnstileSDK } = await import('@/utils/captcha');
        const first = loadTurnstileSDK();
        expect(loadTurnstileSDK()).toBe(first);
        expect(scripts).toHaveLength(1);
        expect(scripts[0].src).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
        const failure = expect(first).rejects.toThrow('Failed to load');
        scripts[0].dispatchEvent(new Event('error'));
        await failure;
        const retry = loadTurnstileSDK();
        expect(scripts).toHaveLength(2);
        vi.stubGlobal('turnstile', { render: vi.fn() });
        scripts[1].dispatchEvent(new Event('load'));
        await expect(retry).resolves.toBeUndefined();
    });
    it('times out instead of leaving verification loading forever', async () => {
        vi.resetModules();
        vi.useFakeTimers();
        vi.stubGlobal('turnstile', undefined);
        vi.spyOn(document.head, 'appendChild').mockImplementation((script) => script);
        const { loadTurnstileSDK } = await import('@/utils/captcha');
        const result = expect(loadTurnstileSDK()).rejects.toThrow('Failed to load');
        await vi.advanceTimersByTimeAsync(15000);
        await result;
    });
});
