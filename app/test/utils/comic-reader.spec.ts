import { describe, expect, it } from 'vitest';
import { readerPathForBook } from '~/utils/comic-reader';

describe('comic reader route', () => {
    it('routes comic containers to the backend reader without changing EPUB/PDF routing', () => {
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'CBZ' }] })).toBe('/read-comic/14');
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'EPUB' }] })).toBe('/read/14');
        expect(readerPathForBook({ id: 14, media_type: 'comic', files: [{ format: 'EPUB' }, { format: 'RAR' }] })).toBe('/read-comic/14');
        expect(readerPathForBook({ id: 14, media_type: 'unknown', files: [{ format: 'PDF' }] })).toBe('/read/14');
        expect(readerPathForBook({ id: 14, media_type: 'unknown', files: [{ format: 'ZIP' }] })).toBeNull();
    });
});
