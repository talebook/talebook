// @vitest-environment happy-dom
/**
 * 实施项 11.6：导入目录列表的归一化与校验。
 *
 * 这些是 `pages/admin/imports.vue` 多目录 UI 的纯逻辑，抽到
 * `composables/useImportRoots.ts` 后可在 happy-dom 下直接单测
 * （页面本身依赖 Nuxt 自动导入，无法在 happy-dom 挂载）。
 */
import { describe, expect, it } from 'vitest';

import {
    IMPORT_ROOT_PREFIX,
    allowedRootsFromSettings,
    isWithinDataPrefix,
    normalizeAllowedRoots,
    validateAllowedRoots,
} from '@/composables/useImportRoots';

describe('normalizeAllowedRoots', () => {
    it('trims whitespace', () => {
        expect(normalizeAllowedRoots(['  /data/a  ', '/data/b'])).toEqual(['/data/a', '/data/b']);
    });

    it('drops blank entries', () => {
        expect(normalizeAllowedRoots(['/data/a', '', '   ', '/data/b'])).toEqual(['/data/a', '/data/b']);
    });

    it('deduplicates preserving first occurrence order', () => {
        expect(normalizeAllowedRoots(['/data/b', '/data/a', '/data/b', '/data/a'])).toEqual([
            '/data/b',
            '/data/a',
        ]);
    });

    it('returns empty array for non-array input', () => {
        expect(normalizeAllowedRoots(null)).toEqual([]);
        expect(normalizeAllowedRoots(undefined)).toEqual([]);
        expect(normalizeAllowedRoots('/data/a')).toEqual([]);
        expect(normalizeAllowedRoots(42)).toEqual([]);
    });

    it('coerces non-string entries', () => {
        expect(normalizeAllowedRoots([123, true])).toEqual(['123', 'true']);
    });

    it('handles an empty array', () => {
        expect(normalizeAllowedRoots([])).toEqual([]);
    });
});

describe('isWithinDataPrefix', () => {
    it('accepts the prefix itself', () => {
        expect(isWithinDataPrefix('/data')).toBe(true);
        expect(isWithinDataPrefix('/data/')).toBe(true);
    });

    it('accepts children', () => {
        expect(isWithinDataPrefix('/data/books')).toBe(true);
        expect(isWithinDataPrefix('/data/books/imports/')).toBe(true);
    });

    it('rejects a sibling with the same string prefix', () => {
        // 关键：/database 不是 /data 的子目录
        expect(isWithinDataPrefix('/database')).toBe(false);
    });

    it('rejects unrelated absolute paths', () => {
        expect(isWithinDataPrefix('/etc')).toBe(false);
        expect(isWithinDataPrefix('/root')).toBe(false);
        expect(isWithinDataPrefix('/')).toBe(false);
    });

    it('rejects blank input', () => {
        expect(isWithinDataPrefix('')).toBe(false);
        expect(isWithinDataPrefix('   ')).toBe(false);
    });

    it('rejects relative paths', () => {
        expect(isWithinDataPrefix('data/books')).toBe(false);
    });

    it('exposes the prefix constant', () => {
        expect(IMPORT_ROOT_PREFIX).toBe('/data/');
    });
});

describe('validateAllowedRoots', () => {
    it('passes a valid list', () => {
        const result = validateAllowedRoots(['/data/a', '/data/b']);
        expect(result.error).toBe('');
        expect(result.roots).toEqual(['/data/a', '/data/b']);
    });

    it('reports empty for an empty list', () => {
        expect(validateAllowedRoots([]).error).toBe('empty');
    });

    it('reports empty when all entries are blank', () => {
        expect(validateAllowedRoots(['', '  ']).error).toBe('empty');
    });

    it('reports outside for a path beyond /data/', () => {
        expect(validateAllowedRoots(['/etc']).error).toBe('outside');
    });

    it('rejects the whole list when one entry is outside', () => {
        const result = validateAllowedRoots(['/data/a', '/etc', '/data/b']);
        expect(result.error).toBe('outside');
    });

    it('rejects /database (string-prefix trap)', () => {
        expect(validateAllowedRoots(['/database']).error).toBe('outside');
    });

    it('normalizes before validating', () => {
        const result = validateAllowedRoots(['  /data/a  ', '/data/a', '']);
        expect(result.error).toBe('');
        expect(result.roots).toEqual(['/data/a']);
    });
});

describe('allowedRootsFromSettings', () => {
    it('reads allowed_roots when present', () => {
        expect(allowedRootsFromSettings({ allowed_roots: ['/data/a', '/data/b'] })).toEqual([
            '/data/a',
            '/data/b',
        ]);
    });

    it('falls back to scan_upload_path when allowed_roots is absent', () => {
        expect(allowedRootsFromSettings({ scan_upload_path: '/data/legacy' })).toEqual(['/data/legacy']);
    });

    it('falls back when allowed_roots is an empty array', () => {
        expect(
            allowedRootsFromSettings({ allowed_roots: [], scan_upload_path: '/data/legacy' }),
        ).toEqual(['/data/legacy']);
    });

    it('returns empty for null settings', () => {
        expect(allowedRootsFromSettings(null)).toEqual([]);
        expect(allowedRootsFromSettings(undefined)).toEqual([]);
    });

    it('returns empty when neither field is usable', () => {
        expect(allowedRootsFromSettings({})).toEqual([]);
        expect(allowedRootsFromSettings({ scan_upload_path: '   ' })).toEqual([]);
    });

    it('normalizes the returned list', () => {
        expect(
            allowedRootsFromSettings({ allowed_roots: ['  /data/a  ', '/data/a', ''] }),
        ).toEqual(['/data/a']);
    });
});