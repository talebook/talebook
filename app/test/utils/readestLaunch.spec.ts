import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildReadestReaderUrl,
    fetchReadestBootstrap,
    parseReadestBookId,
    runReadestLauncher,
    validateReadestBootstrap,
} from '../../public/readest/talebook-launch.js';

const bootstrap = {
    err: 'ok',
    schema: 'talebook.reader.bootstrap.v1',
    engine: 'readest',
    book: { id: 1, format: 'epub', revision: 'abc-123' },
    resource: {
        url: '/read/resource/1.epub?revision=abc-123',
        mime: 'application/epub+zip',
        range: true,
    },
    navigation: {
        back: '/book/1',
        fallback: '/read/1?reader=candle',
    },
};

function renderLauncher() {
    document.documentElement.innerHTML = `
        <head><title>正在启动 Readest</title></head>
        <body>
            <p data-launch-status></p>
            <nav data-launch-actions hidden>
                <a data-action="retry"></a>
                <a data-action="back"></a>
                <a data-action="fallback"></a>
                <a data-action="login" hidden></a>
            </nav>
        </body>
    `;
}

describe('Talebook Readest launcher', () => {
    beforeEach(() => renderLauncher());

    it('accepts only positive numeric book IDs', () => {
        expect(parseReadestBookId('?bookId=12')).toBe('12');
        expect(parseReadestBookId('?bookId=0')).toBeNull();
        expect(parseReadestBookId('?bookId=1%2F..')).toBeNull();
    });

    it('builds an absolute same-origin reader and EPUB URL', () => {
        const launch = buildReadestReaderUrl(bootstrap, {
            bookId: '1',
            origin: 'http://127.0.0.1:9000',
        });
        const target = new URL(launch.target);

        expect(target.origin).toBe('http://127.0.0.1:9000');
        expect(target.pathname).toBe('/readest/reader.html');
        expect(target.searchParams.get('file')).toBe(
            'http://127.0.0.1:9000/read/resource/1.epub?revision=abc-123',
        );
        expect(target.searchParams.get('moke')).toBe('1');
        expect(target.searchParams.get('mokeBookId')).toBe('1');
        expect(target.searchParams.get('mokeReturnTo')).toBe('/book/1');
    });

    it('rejects cross-origin, unversioned, and mismatched resources', () => {
        expect(() => validateReadestBootstrap({
            ...bootstrap,
            resource: { ...bootstrap.resource, url: 'https://example.com/read/resource/1.epub?revision=x' },
        }, { bookId: '1', origin: 'http://127.0.0.1:9000' })).toThrow(/同源/);
        expect(() => validateReadestBootstrap({
            ...bootstrap,
            resource: { ...bootstrap.resource, url: '/read/resource/1.epub' },
        }, { bookId: '1', origin: 'http://127.0.0.1:9000' })).toThrow(/版本/);
        expect(() => validateReadestBootstrap(bootstrap, {
            bookId: '2',
            origin: 'http://127.0.0.1:9000',
        })).toThrow(/标识/);
    });

    it('reports structured bootstrap errors instead of navigating', async () => {
        const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            err: 'user.no_permission',
            msg: '无权在线阅读',
        }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        }));
        const replace = vi.fn();
        const fakeWindow = {
            location: {
                search: '?bookId=1',
                origin: 'http://127.0.0.1:9000',
                replace,
            },
        };

        const launched = await runReadestLauncher({ window: fakeWindow, document, fetchImpl });

        expect(launched).toBe(false);
        expect(replace).not.toHaveBeenCalled();
        expect(document.querySelector('[data-launch-status]')?.textContent).toBe('无权在线阅读');
        expect(document.querySelector('[data-launch-actions]')?.hidden).toBe(false);
        expect(document.querySelector('[data-action="fallback"]')?.getAttribute('href')).toBe(
            '/read/1?reader=candle',
        );
    });

    it('recognizes a login redirect hidden behind fetch follow mode', async () => {
        const response = {
            redirected: true,
            url: 'http://127.0.0.1:9000/login',
            ok: true,
            status: 200,
            headers: new Headers({ 'Content-Type': 'text/html' }),
        };

        await expect(fetchReadestBootstrap({
            bookId: '1',
            origin: 'http://127.0.0.1:9000',
            fetchImpl: vi.fn().mockResolvedValue(response),
        })).rejects.toMatchObject({ login: true });
    });
});
