import { describe, expect, it } from 'vitest';
import {
    buildReadProxyRequestHeaders,
    buildReadProxyResponse,
    buildReadProxyTarget,
    rewriteReadProxyLocation,
} from '../../server/utils/readProxy';

describe('Readest host read proxy', () => {
    it('joins a backend base path with the complete browser request path', () => {
        const target = buildReadProxyTarget(
            'http://127.0.0.1:8080/talebook/',
            new URL('http://127.0.0.1:9000/read/resource/1.epub?revision=abc'),
        );
        expect(target.href).toBe(
            'http://127.0.0.1:8080/talebook/read/resource/1.epub?revision=abc',
        );
    });

    it('forwards cookies and range validators with the public origin', () => {
        const headers = buildReadProxyRequestHeaders(new Headers({
            Cookie: 'session=redacted',
            Range: 'bytes=0-1023',
            'If-None-Match': 'etag-value',
            Connection: 'keep-alive',
            Host: 'untrusted.invalid',
        }), new URL('https://books.example.test:9443/read/resource/1.epub'));

        expect(headers.get('cookie')).toBe('session=redacted');
        expect(headers.get('range')).toBe('bytes=0-1023');
        expect(headers.get('if-none-match')).toBe('etag-value');
        expect(headers.get('connection')).toBeNull();
        expect(headers.get('host')).toBeNull();
        expect(headers.get('accept-encoding')).toBe('identity');
        expect(headers.get('x-forwarded-host')).toBe('books.example.test:9443');
        expect(headers.get('x-forwarded-proto')).toBe('https');
    });

    it('keeps browser-visible redirects local and rewrites a legacy backend EPUB URL', () => {
        expect(rewriteReadProxyLocation(
            '/readest/talebook-launch.html?bookId=1',
            'http://127.0.0.1:9000',
            'http://127.0.0.1:8080',
        )).toBe('/readest/talebook-launch.html?bookId=1');

        const legacy = '/readest/reader.html?file=http%3A%2F%2F127.0.0.1%3A8080%2Fread%2Fresource%2F1.epub%3Frevision%3Dabc';
        const rewritten = rewriteReadProxyLocation(
            legacy,
            'http://127.0.0.1:9000',
            'http://127.0.0.1:8080',
        );
        expect(new URL(rewritten!, 'http://127.0.0.1:9000').searchParams.get('file')).toBe(
            'http://127.0.0.1:9000/read/resource/1.epub?revision=abc',
        );
        expect(rewriteReadProxyLocation(
            'https://reader.example.test/view',
            'http://127.0.0.1:9000',
            'http://127.0.0.1:8080',
        )).toBe('https://reader.example.test/view');
    });

    it('preserves the EPUB HEAD and Range response contract', async () => {
        const head = buildReadProxyResponse(new Response(null, {
            status: 200,
            headers: {
                'Content-Type': 'application/epub+zip',
                'Content-Length': '440912',
                'Accept-Ranges': 'bytes',
                ETag: 'book-etag',
                'Cache-Control': 'private, no-store',
                Connection: 'keep-alive',
            },
        }), 'HEAD', 'http://127.0.0.1:9000', 'http://127.0.0.1:8080');

        expect(head.body).toBeNull();
        expect(head.headers.get('content-length')).toBe('440912');
        expect(head.headers.get('accept-ranges')).toBe('bytes');
        expect(head.headers.get('etag')).toBe('book-etag');
        expect(head.headers.get('cache-control')).toBe('private, no-store');
        expect(head.headers.get('connection')).toBeNull();

        const ranged = buildReadProxyResponse(new Response(new Uint8Array([0x50, 0x4b]), {
            status: 206,
            headers: {
                'Content-Type': 'application/epub+zip',
                'Content-Length': '2',
                'Content-Range': 'bytes 0-1/440912',
                'Accept-Ranges': 'bytes',
                ETag: 'book-etag',
            },
        }), 'GET', 'http://127.0.0.1:9000', 'http://127.0.0.1:8080');

        expect(ranged.status).toBe(206);
        expect(ranged.headers.get('content-length')).toBe('2');
        expect(ranged.headers.get('content-range')).toBe('bytes 0-1/440912');
        expect(new Uint8Array(await ranged.arrayBuffer())).toEqual(new Uint8Array([0x50, 0x4b]));
    });
});
