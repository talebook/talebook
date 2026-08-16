import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Plugin management', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('shows four business tabs and reuses one installation across capabilities', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins');
        await catalogPromise;

        await expect(page.getByRole('tab', { name: '元数据' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '笔记（含章评）' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '评价' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '书源' })).toBeVisible();
        await expect(page.getByText('Talebook 元数据')).toBeVisible();

        await page.getByRole('tab', { name: '书源' }).click();
        await expect(page.getByText('Generic OPDS')).toBeVisible();
        await expect(page.getByText('Legado 在线书源')).toBeVisible();
        await expect(page.getByText('Calibre Content Server')).toHaveCount(0);
        await expect(page.getByText('Calibre-Web')).toHaveCount(0);
    });

    test('opens details, tests a connection, and exposes the shared run log', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        await expect(page.getByText('权限与数据范围')).toBeVisible();

        await page.getByRole('button', { name: '测试连接' }).click();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();
        await page.getByRole('link', { name: '执行记录' }).first().click();
        await expect(page.getByText('Generic OPDS · 内置连接')).toBeVisible();
        await expect(page.getByText('成功').first()).toBeVisible();
    });

    test('legacy book source URL redirects into the plugin source tab', async ({ page }) => {
        await page.goto('/admin/booksources');
        await expect(page).toHaveURL(/\/admin\/plugins\?.*tab=book_sources/);
        await expect(page.getByText('Legado 书源管理')).toBeVisible();
        await expect(page.getByText('测试书源')).toBeVisible();
    });

    test('keeps filters in the URL and reflows the details panel on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/admin/plugins?tab=book_sources');
        const description = page.getByText('连接外部服务，补全书籍信息、导入笔记与评价，或添加书源。');
        await expect(description).toBeVisible();
        expect(await description.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const search = page.getByRole('textbox', { name: '搜索名称、说明或能力' });
        await search.fill('OPDS');
        await expect(page).toHaveURL(/q=OPDS/);
        await expect(page.getByText('Generic OPDS')).toBeVisible();

        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox.width).toBeLessThanOrEqual(375);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth).toBeLessThanOrEqual(375);
    });

    test('keeps focus contained in details and restores it after Escape', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        const details = card.getByRole('button', { name: '详情' });
        await details.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(details).toBeFocused();
    });
});
