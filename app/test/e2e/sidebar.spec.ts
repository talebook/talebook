import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Navigation Sidebar', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('uses consolidated primary navigation', async ({ page }) => {
        await page.goto('/');
        const nav = page.locator('nav');

        await expect(nav.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
        await expect(nav.getByRole('link', { name: '我的阅读' })).toHaveAttribute('href', '/me/shelf');
        await expect(nav.getByRole('link', { name: '书库浏览' })).toHaveAttribute('href', '/library/local');
        await expect(nav.getByRole('link', { name: '本地书库' })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: '网络书库' })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: /已读书目/ })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'OPDS 介绍' })).toHaveCount(0);
        await expect(nav.getByRole('link', { name: 'WebDAV 介绍' })).toHaveCount(0);

        const labels = await nav.locator('.v-list-item-title').allTextContents();
        expect(labels.indexOf('我的阅读')).toBe(labels.indexOf('首页') + 1);
    });

    test('keeps the library entry visible when the legacy switch is off', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: false },
        });
        await page.goto('/');

        await expect(page.locator('nav').getByRole('link', { name: '书库浏览' })).toBeVisible();
        await page.locator('nav').getByRole('link', { name: '书库浏览' }).click();
        await expect(page).toHaveURL('/library/local');
    });

    test('keeps configured friendship links outside the help menu', async ({ page }) => {
        await page.goto('/');
        await expect(page.locator('.sidebar-help__trigger')).toBeVisible();
        await page.locator('.sidebar-help__trigger').click();

        const menu = page.locator('.sidebar-help__card');
        await expect(menu.getByText('更新日志')).toBeVisible();
        await expect(menu.getByText('GitHub')).toBeVisible();
        await expect(menu.getByText('反馈')).toBeVisible();
        await expect(menu.getByText(/系统版本 1\.0\.0/)).toBeVisible();
        await expect(menu.getByText(/用户数 5/)).toBeVisible();
        await expect(menu.getByText('文档')).toHaveCount(0);
        await expect(menu.getByTestId('sidebar-help-logo')).toBeVisible();

        const drawerBox = await page.locator('.app-navigation-drawer').boundingBox();
        expect(drawerBox).not.toBeNull();
        await expect.poll(async () => {
            const menuBox = await menu.boundingBox();
            return menuBox?.x ?? Number.POSITIVE_INFINITY;
        }).toBeLessThanOrEqual(drawerBox!.x + 16);
    });

    test('legacy reading history route keeps the finished subtab query', async ({ page }) => {
        await page.goto('/user/history?tab=finished');

        await expect(page).toHaveURL('/me/history?tab=finished');
        await expect(page.getByRole('tab', { name: /已读完 \[1\]/ })).toHaveAttribute('aria-selected', 'true');
    });

    test('sidebar stays visible at md width', async ({ page }) => {
        await page.setViewportSize({ width: 1100, height: 800 });
        await page.goto('/');
        const homeLink = page.locator('nav').getByRole('link', { name: '首页' });
        await homeLink.waitFor({ state: 'visible' });

        const box = await homeLink.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
    });
});
