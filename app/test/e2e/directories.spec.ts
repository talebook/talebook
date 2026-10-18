import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
test('directory browsing is lazy, direct by default, and supports page jumps', async ({ request, page }) => {
    await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    const calls: URLSearchParams[] = [];
    await page.route('**/api/library/directories?*', route => {
        const q = new URL(route.request().url()).searchParams;
        calls.push(q);
        const path = q.get('path') || '';
        const directories = path === ''
            ? [{ path: '/books', name: 'books', count: 140, has_children: true }]
            : path === '/books' ? [{ path: '/books/child', name: 'child', count: 10, has_children: false }] : [];
        const child = path === '/books/child';
        return route.fulfill({ json: {
            err: 'ok', path, directories, total: child ? 1 : 130,
            books: q.get('children_only') ? [] : [{ id: child ? 2 : 1, title: child ? '子目录图书' : '当前目录图书', img: '/get/cover/1', comments: '测试', format_sizes: { EPUB: 1000 } }],
        } });
    });
    await page.goto('/directories');
    await expect(page.getByText('请在左侧选择一个目录。')).toBeVisible();
    await expect(page.getByRole('link', { name: '文件目录', exact: true }).first()).toBeVisible();
    await page.locator('[data-directory-path="/books"]').click();
    await expect(page.getByText('当前目录图书', { exact: true })).toBeVisible();
    await expect(page.getByTestId('directory-recursive').locator('input')).not.toBeChecked();
    const jump = page.getByTestId('page-jump');
    await jump.locator('input').fill('2');
    await jump.locator('input').press('Enter');
    await expect.poll(() => calls.some(q => q.get('path') === '/books' && q.get('start') === '60' && q.get('recursive') === '0')).toBe(true);
    await expect(page).toHaveURL(/page=2/);
    await page.getByRole('button', { name: '展开 books', exact: true }).click();
    await page.locator('[data-directory-path="/books/child"]').click();
    await expect(page.getByText('子目录图书', { exact: true })).toBeVisible();
    await expect(page).toHaveURL(/page=1/);
    await page.getByTestId('directory-recursive').locator('input').check();
    await expect.poll(() => calls.some(q => q.get('path') === '/books/child' && q.get('recursive') === '1' && q.get('start') === '0')).toBe(true);
    await page.reload();
    await expect(page.locator('[data-directory-path="/books/child"]')).toHaveAttribute('aria-current', 'true');
    await expect(page.getByTestId('directory-recursive').locator('input')).toBeChecked();
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    await expect.poll(() => calls.some(q => q.get('path') === '' && q.get('refresh') === '1')).toBe(true);
    await page.setViewportSize({ width: 320, height: 800 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
