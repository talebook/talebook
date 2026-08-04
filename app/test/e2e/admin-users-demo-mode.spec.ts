
import { test, expect } from '@playwright/test';

test.describe('Admin Users - Demo Mode', () => {
    test('demo account actions are hidden only while demo mode is enabled', async ({ page, request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true, demoMode: true }
        });

        const usersPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/users'));
        await page.goto('/admin/users');
        await usersPromise;
        await expect(page.locator('.loading-page')).toBeHidden();

        const demoRow = page.locator('tbody tr', { hasText: 'demo@example.com' });
        const adminRow = page.locator('tbody tr', { hasText: 'admin@example.com' });

        await expect(demoRow.getByText('演示模式下该账号操作已锁定')).toBeVisible();
        await expect(demoRow.getByRole('button', { name: '操作' })).toHaveCount(0);
        await expect(adminRow.getByRole('button', { name: '操作' })).toBeVisible();

        // 关闭演示模式后，演示账号的操作按钮应恢复显示
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true, demoMode: false }
        });
        const reloadedUsersPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/users'));
        await page.reload();
        await reloadedUsersPromise;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.locator('tbody tr', { hasText: 'demo@example.com' }).getByRole('button', { name: '操作' })).toBeVisible();
    });
});
