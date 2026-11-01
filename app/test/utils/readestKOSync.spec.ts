import { describe, it, expect, vi } from 'vitest';
import { usesTalebookKOSync, requestTalebookKOSync } from '../../public/readest/kosync-transport.js';

const location = (source = 'https://books.example') => ({
    origin: 'https://books.example',
    search: `?moke=1&mokeSourceServerUrl=${encodeURIComponent(source)}`,
});

const request = { serverUrl: 'https://sync.example', endpoint: '/users/auth', method: 'GET',
    headers: { 'X-Auth-User': 'reader', 'X-Auth-Key': 'key' } };

describe('Readest KOSync Talebook transport', () => {
    it('selects only same-origin embedded web readers', () => {
        expect(usesTalebookKOSync(location())).toBe(true);
        expect(usesTalebookKOSync(location('https://other.example'))).toBe(false);
        expect(usesTalebookKOSync({ origin: location().origin, search: '' })).toBe(false);
        expect(usesTalebookKOSync(location('invalid'))).toBe(false);
        expect(usesTalebookKOSync(undefined)).toBe(false);
    });

    it.each(['https://sync.example', 'http://192.168.1.20:8080/kosync'])('proxies %s through the same origin', async serverUrl => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            err: 'ok', status: 200, data: { authorized: 'OK' },
        })));
        const result = await requestTalebookKOSync({ ...request, serverUrl }, fetchImpl);
        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe('/api/kosync');
        expect(init.credentials).toBe('same-origin');
        expect(init.redirect).toBe('error');
        expect(init.headers['X-Talebook-KOSync']).toBe('1');
        expect(JSON.parse(init.body)).toEqual({ ...request, serverUrl });
        expect(await result.json()).toEqual({ authorized: 'OK' });
    });

    it.each([400, 401, 402, 403, 404, 429, 500])('preserves upstream HTTP %i for authentication and sync handling', async status => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            err: 'ok', status, data: { message: 'upstream error' },
        })));
        const result = await requestTalebookKOSync(request, fetchImpl);
        expect(result.status).toBe(status);
        expect(result.ok).toBe(false);
        expect(await result.json()).toEqual({ message: 'upstream error' });
    });

    it.each(['', '/team/books'])('preserves deployment prefix %s', async prefix => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            err: 'ok', status: 200, data: { authorized: 'OK' },
        })));
        await requestTalebookKOSync(request, fetchImpl, {
            href: `https://books.example${prefix}/readest/reader.html?moke=1`,
        });
        expect(fetchImpl.mock.calls[0][0]).toBe(`${prefix}/api/kosync`);
    });

    it('shows proxy errors without pretending authentication succeeded', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            err: 'kosync.upstream', msg: 'KOSync server could not be resolved',
        })));
        await expect(requestTalebookKOSync(request, fetchImpl)).rejects.toThrow('could not be resolved');
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('rejects expired Talebook sessions and malformed replies', async () => {
        for (const data of [{ err: 'user.need_login' }, { err: 'ok', status: 0, data: {} }]) {
            await expect(requestTalebookKOSync(request, vi.fn().mockResolvedValue(
                new Response(JSON.stringify(data)),
            ))).rejects.toThrow();
        }
    });
});
