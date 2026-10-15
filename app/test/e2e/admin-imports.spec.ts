import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

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
