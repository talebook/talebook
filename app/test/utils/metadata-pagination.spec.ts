import { describe, expect, it } from 'vitest';
import { metadataPage } from '../metadata-pagination';

const categories = (count: number) => Array.from({ length: count }, (_, id) => ({
    id, name: `分类${String(id).padStart(5, '0')}`, count: 1
}));

describe('mock MetaList contract', () => {
    it.each([999, 1000, 1001])('caps %i items even with show=all', count => {
        const result = metadataPage('tag', categories(count), { show: 'all' });
        expect(result.total).toBe(count);
        expect(result.paginated).toBe(count >= 1000);
        expect(result.items).toHaveLength(count >= 1000 ? 100 : count);
        expect(result.pages).toBe(count >= 1000 ? Math.ceil(count / 100) : 1);
    });

    it('traverses 40000 tied categories without omissions when source order changes', () => {
        const source = categories(40000);
        const seen: number[] = [];
        for (let page = 1; page <= 40; page++) {
            const result = metadataPage('tag', page % 2 ? source : [...source].reverse(), { page, page_size: 1000 });
            expect(result.pages).toBe(40);
            seen.push(...result.items.map(item => item.id));
        }
        expect(seen).toEqual(source.map(item => item.id));
    });

    it('handles empty, last, out-of-range, search and invalid parameters', () => {
        expect(metadataPage('tag', [], { page: 1 }).pages).toBe(1);
        const source = categories(1001);
        expect(metadataPage('tag', source, { page: 2, page_size: 1000 }).items).toEqual(source.slice(1000));
        expect(metadataPage('tag', source, { page: 3, page_size: 1000 }).items).toEqual([]);
        const result = metadataPage('tag', source, { q: '  分类01000  ', page_size: 1 });
        expect(result).toMatchObject({ total: 1, unfiltered_total: 1001, page: 1, pages: 1 });
        expect(result.items).toEqual(source.slice(1000));
        for (const query of [{ page: 0 }, { page: -1 }, { page: 'bad' }, { page: '1.5' }, { page_size: '' }, { page_size: 0 }, { page_size: 1001 }]) {
            expect(metadataPage('tag', source, query).err).toBe('params.pagination.invalid');
        }
    });

    it('sorts numeric ratings and searches fixture names without case sensitivity', () => {
        const source = [2, 10, 4].map(value => ({ id: value, name: value, count: 1 }));
        expect(metadataPage('rating', source, { page_size: 1 }).items[0].name).toBe(10);
        expect(metadataPage('format', [{ id: 'EPUB', name: 'EPUB', count: 1 }], { q: 'epub' }).total).toBe(1);
    });
});
