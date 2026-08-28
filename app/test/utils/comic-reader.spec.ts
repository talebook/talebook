import { describe, expect, it } from 'vitest';
import {
    readerPathForBook,
    toInitialProgress,
    toReaderManifest,
    toStoredProgress,
    type TalebookComicManifest,
} from '~/utils/comic-reader';

function sourceManifest(): TalebookComicManifest {
    return {
        err: 'ok',
        contract_version: 1,
        book_id: 14,
        title: '漫画样例',
        revision: 'abc123',
        pages_count: 2,
        pages: [
            { id: 'abc123:1', index: 1, url: '/api/book/14/comic/pages/1?revision=abc123', width: 800, height: 1200, mime_type: 'image/png' },
            { id: 'abc123:0', index: 0, url: '/api/book/14/comic/pages/0?revision=abc123', width: 900, height: 1200, mime_type: 'image/jpeg' },
        ],
    };
}

describe('comic reader contract adapter', () => {
    it('routes comic containers without changing EPUB/PDF routing', () => {
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'CBZ' }] })).toBe('/read-comic/14');
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'EPUB' }] })).toBe('/read/14');
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'EPUB' }, { format: 'RAR' }] })).toBe('/read-comic/14');
        expect(readerPathForBook({ id: 14, media_type: 'unknown', files: [{ format: 'PDF' }] })).toBe('/read/14');
        expect(readerPathForBook({ id: 14, media_type: 'unknown', files: [{ format: 'ZIP' }] })).toBeNull();
    });

    it('sorts the server manifest by its contiguous index without exposing archive fields', () => {
        const manifest = toReaderManifest(sourceManifest());

        expect(manifest.id).toBe('14:abc123');
        expect(manifest.pages.map(page => page.id)).toEqual(['abc123:0', 'abc123:1']);
        expect(manifest.pages[0]).toEqual({
            id: 'abc123:0',
            src: '/api/book/14/comic/pages/0?revision=abc123',
            alt: '漫画样例 · 1',
            width: 900,
            height: 1200,
            mimeType: 'image/jpeg',
        });
    });

    it('rejects malformed or non-contiguous page contracts', () => {
        const source = sourceManifest();
        source.pages[1].index = 4;
        expect(() => toReaderManifest(source)).toThrow('invalid comic page');

        const empty = sourceManifest();
        empty.pages = [];
        expect(() => toReaderManifest(empty)).toThrow('invalid comic manifest');
    });

    it('restores only versioned comic progress and serializes reader events', () => {
        expect(toInitialProgress({ kind: 'comic', version: 1, pageId: 'abc123:1', pageIndex: 1 })).toEqual({
            pageId: 'abc123:1',
            pageIndex: 1,
        });
        expect(toInitialProgress({ kind: 'epub', version: 1, pageIndex: 9 })).toEqual({ pageIndex: 0 });

        expect(toStoredProgress({
            pageId: 'abc123:1',
            pageIndex: 1,
            pageNumber: 2,
            pagesCount: 2,
            percent: 100,
            completed: true,
            timestamp: 123,
        })).toEqual({
            kind: 'comic',
            version: 1,
            pageId: 'abc123:1',
            pageIndex: 1,
            percent: 100,
            completed: true,
        });
    });
});
