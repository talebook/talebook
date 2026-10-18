import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test('separates skipped records from pending and resets selection on tab changes', async ({ request, page }) => {
    await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    await page.route('**/api/admin/scan/list?*', async route => {
        const skipped = new URL(route.request().url()).searchParams.get('filter') === 'skipped';
        await route.fulfill({ json: {
            err: 'ok', scan_dir: '/books', import_mode: 'index',
            watch_status: { state: 'off' },
            summary: { total: 3, todo: 1, done: 0, failed: 0, skipped: 2 },
            total: skipped ? 2 : 1,
            items: skipped
                ? [1, 2].map(id => ({ id, hash: `skip-${id}`, status: 'drop', title: `Skipped ${id}`, path: `/books/skip-${id}.epub` }))
                : [{ id: 3, hash: 'ready', status: 'ready', title: 'Pending book', path: '/books/ready.epub' }],
        } });
    });
    await page.goto('/admin/imports');
    await expect(page.getByRole('tab', { name: '待处理 (1)' })).toBeVisible();
    await expect(page.getByText('Pending book', { exact: true })).toBeVisible();
    await page.getByRole('checkbox').nth(1).check();
    await page.getByTestId('import-skipped-tab').click();
    await expect(page.getByRole('tab', { name: '已跳过 (2)' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Skipped 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending book', { exact: true })).toHaveCount(0);
    await page.getByRole('checkbox').nth(1).check();
    await expect(page.getByRole('button', { name: /导入选中书籍/ })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/import-skipped-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 320, height: 800 });
    await expect(page.getByTestId('import-skipped-tab')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    await page.screenshot({ path: 'test-results/import-skipped-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.getByRole('tab', { name: '待处理 (1)' }).click();
    await expect(page.getByText('Pending book', { exact: true })).toBeVisible();
    await expect(page.getByText('Skipped 1', { exact: true })).toHaveCount(0);
    await page.route('**/api/admin/scan/list?*', route => route.fulfill({ json: {
        err: 'ok', summary: { total: 1, todo: 1, done: 0, failed: 0, skipped: 0 },
        total: 0, items: [], watch_status: { state: 'off' },
    } }));
    await page.getByTestId('import-skipped-tab').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('tab', { name: '已跳过 (0)' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Pending book', { exact: true })).toHaveCount(0);
});

test.describe('Admin import directories', () => {
    test.beforeEach(async ({ request, page }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
        await page.goto('/admin/imports');
        await page.getByRole('button', { name: '导入设置' }).click();
        await expect(page.getByTestId('import-root-0')).toBeVisible();
    });

    test('saves arbitrary absolute directories, including a trailing slash', async ({ page }) => {
        await expect(page.getByTestId('import-default-dir')).toHaveCount(0);
        await page.getByTestId('import-root-0').locator('input').fill('/books/');
        await page.getByTestId('import-root-add').click();
        await page.getByTestId('import-root-1').locator('input').fill('/books1');
        await page.getByRole('radio', { name: /仅索引/ }).check();
        const saved = page.waitForResponse(r => r.url().includes('/api/admin/import/settings') && r.request().method() === 'POST');
        await page.getByRole('button', { name: '保存设置' }).click();
        const response = await saved;
        expect(response.request().postDataJSON().import_directories).toEqual(['/books/', '/books1']);
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.reload();
        await page.getByRole('button', { name: '导入设置' }).click();
        await expect(page.getByTestId('import-root-0').locator('input')).toHaveValue('/books');
        await expect(page.getByTestId('import-root-1').locator('input')).toHaveValue('/books1');
        await expect(page.getByRole('radio', { name: /仅索引/ })).toBeChecked();
    });

    test('rejects relative and empty directory lists with visible explanations', async ({ page }) => {
        await page.getByTestId('import-root-0').locator('input').fill('relative/books');
        await page.getByRole('button', { name: '保存设置' }).click();
        await expect(page.getByText('请输入服务器上的绝对目录路径。')).toBeVisible();
        await page.getByTestId('import-root-remove-0').click();
        await page.getByRole('button', { name: '保存设置' }).click();
        await expect(page.getByText('至少需要一个导入目录。')).toBeVisible();
    });

    test('keeps the dialog open for missing directories', async ({ page }) => {
        await page.getByTestId('import-root-0').locator('input').fill('/mock/missing');
        await page.getByRole('button', { name: '保存设置' }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('目录不存在，请检查路径或先在服务器上创建目录。').first()).toBeVisible();
    });

    test('server picker writes into the same directory list', async ({ page }) => {
        await page.getByTestId('import-root-pick-0').click();
        await page.getByText('incoming', { exact: true }).click();
        await page.getByRole('button', { name: '选择此目录' }).click();
        await expect(page.getByTestId('import-root-0').locator('input')).toHaveValue('/data/books/imports/incoming');
    });
});


test.describe('Import all without selecting books', () => {
    test('keeps the all action visible alongside selected actions', async ({ request, page }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
        await page.goto('/admin/imports');
        const all = page.getByTestId('import-all-books');
        await expect(all).toBeVisible();
        await expect(all).toBeEnabled();
        const boxes = page.getByRole('checkbox');
        expect(await boxes.count()).toBeGreaterThan(1);
        await boxes.nth(1).check();
        await expect(all).toBeVisible();
        await expect(all).toBeEnabled();
        const sent = page.waitForRequest(r => r.url().includes('/api/admin/import/run') && r.method() === 'POST');
        await all.click();
        expect((await sent).postDataJSON().hashlist).toBe('all');
    });
});
