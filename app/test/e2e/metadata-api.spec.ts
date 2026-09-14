import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test('mock category routes expose the real pagination response contract', async ({ request }) => {
    for (const meta of ['publisher', 'author', 'tag', 'format', 'series', 'rating']) {
        const response = await request.get(`${mockApi}/api/${meta}?page=1&page_size=2&show=all`);
        expect(response.ok()).toBe(true);
        const data = await response.json();
        expect(data).toMatchObject({ err: 'ok', meta, page: 1, page_size: 2, paginated: true });
        expect(data.title).toBeTruthy();
        expect(data.unfiltered_total).toBe(data.total);
        expect(data.pages).toBe(Math.max(1, Math.ceil(data.total / 2)));
        expect(data.items.length).toBeLessThanOrEqual(2);
    }
});

test('mock search totals, final page and parameter failures match MetaList', async ({ request }) => {
    const get = async (query: string) => (await request.get(`${mockApi}/api/publisher?${query}`)).json();
    expect(await get('page=1&page_size=10')).toMatchObject({ total: 120, pages: 12 });
    expect((await get('page=2&page_size=100')).items).toHaveLength(20);
    expect((await get('page=3&page_size=100')).items).toEqual([]);
    expect(await get('page=1&page_size=100&q=测试出版社11')).toMatchObject({ total: 11, unfiltered_total: 120, pages: 1 });
    expect(await get('q=不存在&page=1')).toMatchObject({ items: [], total: 0, pages: 1 });
    for (const query of ['page=0', 'page=1.5', 'page_size=1001', 'page_size=bad']) {
        expect(await get(query)).toMatchObject({ err: 'params.pagination.invalid' });
    }
});
