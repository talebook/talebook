import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

async function resetTrash(request) {
    await request.post(`${mockApi}/_test/reset`, {
        data: { installed: true },
    });
}

test.describe('Admin trash management', () => {
    test.beforeEach(async ({ request }) => {
        await resetTrash(request);
    });

    test('lists deleted books and restores one book', async ({ page }) => {
        const trashResponse = page.waitForResponse(response => (
            response.url().includes('/api/admin/trash') && response.request().method() === 'GET'
        ));
        await page.goto('/admin/trash');
        await trashResponse;

        await expect(page.getByRole('heading', { name: '回收站管理' })).toBeVisible();
        await expect(page.getByText('被删除的普通书')).toBeVisible();
        await expect(page.getByText('测试作者')).toBeVisible();
        await expect(page.getByText('1.50 MB')).toBeVisible();

        const row = page.locator('tbody tr').filter({ hasText: '被删除的普通书' });
        await row.getByRole('button', { name: '恢复' }).click();

        await expect(page.getByText('已恢复 1 本书籍')).toBeVisible();
        await expect(page.getByText('被删除的普通书')).toBeHidden();
    });

    test('requires a second confirmation before permanent deletion', async ({ page }) => {
        await page.goto('/admin/trash');
        await expect(page.getByText('待永久删除的书')).toBeVisible();

        const row = page.locator('tbody tr').filter({ hasText: '待永久删除的书' });
        await row.getByRole('button', { name: '永久删除' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('确认永久删除')).toBeVisible();
        await expect(dialog.getByText('此操作不可撤销，无法从回收站恢复。')).toBeVisible();
        await expect(page.getByText('待永久删除的书')).toBeVisible();

        await dialog.getByTestId('confirm-permanent-delete').click();
        await expect(page.getByText('已永久删除 1 本书籍')).toBeVisible();
        await expect(page.getByText('待永久删除的书')).toBeHidden();
    });

    test('supports batch selection and remains usable on a phone viewport', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto('/admin/trash');
        await expect(page.getByText('被删除的普通书')).toBeVisible();

        const cards = page.locator('.trash-mobile-card');
        await expect(cards).toHaveCount(2);
        await expect(cards.nth(0).getByText('2026/8/29')).toBeVisible();
        await expect(cards.nth(0).getByText('1.50 MB')).toBeVisible();
        await expect(cards.nth(0).getByRole('button', { name: '永久删除' })).toBeVisible();

        await page.getByRole('checkbox', { name: '选择《被删除的普通书》' }).click();
        await page.getByRole('checkbox', { name: '选择《待永久删除的书》' }).click();
        await expect(page.getByText('已选择 2 本')).toBeVisible();
        await expect(page.getByTestId('restore-selected')).toBeVisible();
        await expect(page.getByTestId('delete-selected')).toBeVisible();

        const hasPageOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(hasPageOverflow).toBe(false);

        await page.getByTestId('delete-selected').click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('即将永久删除所选 2 本书籍及其文件。')).toBeVisible();
        const box = await dialog.boundingBox();
        expect(box?.width || 0).toBeLessThanOrEqual(320);
    });
});
