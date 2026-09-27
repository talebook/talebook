import { describe, it, expect } from 'vitest';
import { normalizeBasePath, withBasePath } from '../../utils/base-path';

describe('deployment base path', () => {
    it.each(['', '/', '/readest-test/', '/team/books'])('normalizes %s', value => {
        expect(normalizeBasePath(value)).toBe(value.replace(/\/$/, ''));
    });
    it.each(['//evil', 'https://evil', 'books', '/a/../b', '/a%2Fb', '/a?x', '/a#x', '/a\\b', '/a\nb', '/a//b'])('rejects %s', value => {
        expect(() => normalizeBasePath(value)).toThrow();
    });
    it.each([
        ['/api/book/1?x=%2F#y', '/team/books/api/book/1?x=%2F#y'],
        ['/', '/team/books/'],
        ['/team/books/api', '/team/books/api'],
        ['/team/books?x=1', '/team/books?x=1'],
        ['/team/bookshop', '/team/books/team/bookshop'],
        ['https://cdn.example/a', 'https://cdn.example/a'],
        ['//cdn.example/a', '//cdn.example/a'],
        ['data:image/png,a', 'data:image/png,a'],
        ['blob:https://example/a', 'blob:https://example/a'],
        ['chapter.html', 'chapter.html'],
        ['#chapter', '#chapter'],
    ])('prefixes local URL %s once', (url, expected) => {
        expect(withBasePath(url, '/team/books')).toBe(expected);
        expect(withBasePath(url, '')).toBe(url);
    });
});
