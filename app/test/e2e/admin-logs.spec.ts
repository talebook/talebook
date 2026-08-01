import { test, expect } from '@playwright/test';

test.describe('Admin System Logs', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true }
        });
    });

    test('level filters toggle visibility of info/warning/error lines', async ({ page }) => {
        await page.goto('/admin/logs');
        await expect(page.locator('.loading-page')).toBeHidden();

        const infoLine = page.getByText('mock info line');
        const warningLine = page.getByText('mock warning line');
        const errorLine = page.getByText('mock error line');

        await expect(infoLine).toBeVisible();
        await expect(warningLine).toBeVisible();
        await expect(errorLine).toBeVisible();

        // 取消勾选“错误”后，错误行应隐藏，其余不受影响
        await page.getByLabel('错误').uncheck();
        await expect(errorLine).toBeHidden();
        await expect(infoLine).toBeVisible();
        await expect(warningLine).toBeVisible();

        // 取消勾选“警告”后，警告行也应隐藏
        await page.getByLabel('警告').uncheck();
        await expect(warningLine).toBeHidden();
        await expect(infoLine).toBeVisible();

        // 全部取消勾选后应显示筛选提示文案
        await page.getByLabel('信息').uncheck();
        await expect(page.getByText('当前筛选条件下暂无日志内容')).toBeVisible();
    });

    test('changing line count reloads logs without clicking refresh', async ({ page }) => {
        await page.goto('/admin/logs');
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByText('mock error line')).toBeVisible();

        const reloadPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/log') && resp.url().includes('lines=100'));
        await page.getByLabel('显示最近行数').click();
        await page.getByRole('option', { name: '100' }).click();
        await reloadPromise;

        // 未点击“刷新”按钮，日志内容也应已按新的行数重新加载
        await expect(page.getByText('mock error line')).toBeVisible();
    });
});
