import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
test.beforeEach(async ({ request }) => {
    await request.post(`${mockApi}/_test/reset`, { data: { installed: true, showNetworkLibrary: true } });
});

test('library jump preserves filters and opens book details in a new tab', async ({ page }) => {
    const starts: string[] = [];
    await page.route('**/api/library?*', route => {
        const query = new URL(route.request().url()).searchParams;
        starts.push(query.get('start') || '0');
        return route.fulfill({ contentType: 'application/x-ndjson', body: [
            { err: 'ok', total: 1800 }, { id: 1, title: '跳页测试图书', img: '/get/cover/1', comments: '测试', format_sizes: { EPUB: 1024 } },
        ].map(row => JSON.stringify(row)).join('\n') + '\n' });
    });
    await page.goto('/library/local');
    const filterResponse = page.waitForResponse(r => r.url().includes('/api/library?') && new URL(r.url()).searchParams.get('publisher') === '测试出版社1');
    await page.getByTestId('library-filter-publisher').getByText('测试出版社1', { exact: true }).click();
    await filterResponse;
    const jump = page.getByTestId('page-jump').last();
    await expect(jump.getByRole('button', { name: '跳转' })).toBeEnabled();
    await jump.locator('input').fill('12');
    const response = page.waitForResponse(r => r.url().includes('/api/library?') && new URL(r.url()).searchParams.get('start') === '660');
    await jump.locator('input').press('Enter');
    const jumped = await response;
    expect(new URL(jumped.url()).searchParams.get('publisher')).toBe('测试出版社1');
    await expect(page.getByTestId('book-card').first()).toBeVisible();
    expect(starts.filter(start => start === '660')).toHaveLength(1);
    const currentURL = page.url();
    const popup = page.waitForEvent('popup');
    await page.getByTestId('book-card').first().click();
    const details = await popup;
    await details.waitForURL('**/book/1');
    expect(page.url()).toBe(currentURL);
    await expect(jump.locator('input')).toHaveValue('12');
    await details.close();
    await page.setViewportSize({ width: 320, height: 800 });
    await jump.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('admin table jump keeps sorting and rejects out of range pages', async ({ page }) => {
    const calls: URLSearchParams[] = [];
    await page.route('**/api/admin/book/list?*', route => {
        calls.push(new URL(route.request().url()).searchParams);
        return route.fulfill({ json: { err: 'ok', total: 500, items: [{ id: 1, title: '表格图书', authors: [], tags: [], format_sizes: { PDF: 100 } }] } });
    });
    await page.goto('/admin/books');
    const jump = page.getByTestId('page-jump');
    await jump.locator('input').fill('7');
    await jump.locator('input').press('Enter');
    await expect.poll(() => calls.some(q => q.get('page') === '7')).toBe(true);
    const requested = calls.filter(q => q.get('page') === '7');
    expect(requested).toHaveLength(1);
    expect(requested[0].get('sort')).toBe(calls[0].get('sort'));
    const count = calls.length;
    await jump.locator('input').fill('999');
    await jump.getByRole('button', { name: '跳转' }).click();
    await expect(jump).toContainText('请输入 1 到 50');
    expect(calls).toHaveLength(count);
});

test('metadata lists jump directly to the requested page', async ({ page }) => {
    await page.goto('/publisher');
    const jump = page.getByTestId('page-jump');
    await jump.locator('input').fill('2');
    const response = page.waitForResponse(r => r.url().includes('/api/publisher?') && new URL(r.url()).searchParams.get('page') === '2');
    await jump.locator('input').press('Enter');
    await response;
    await expect(page.getByTestId('metadata-items').locator('.v-chip')).toHaveCount(20);
    await expect(jump.locator('input')).toHaveValue('2');
});

test('client table shares page and page-size changes with its jump form', async ({ page }) => {
    await page.route('**/api/admin/trash', route => route.fulfill({ json: {
        err: 'ok', total_size: 5000,
        items: Array.from({ length: 50 }, (_, i) => ({ id: i + 1, title: `回收测试 ${i + 1}`, deleted_at: '2026-10-18T12:00:00', formats: ['EPUB'], size: 100 })),
    } }));
    await page.goto('/admin/trash');
    const jump = page.getByTestId('page-jump');
    await jump.locator('input').fill('2');
    await jump.locator('input').press('Enter');
    await expect(page.getByText('回收测试 11', { exact: true })).toBeVisible();
    await expect(page.getByText('回收测试 1', { exact: true })).toHaveCount(0);
    const pageSize = page.getByRole('combobox', { name: '每页条目' }).first();
    await pageSize.focus();
    await pageSize.press('ArrowDown');
    await page.getByRole('option', { name: '25', exact: true }).click();
    await expect(jump.locator('input')).toHaveValue('1');
    await expect(jump).toContainText('共 2 页');
});
