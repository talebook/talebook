import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Route-backed navigation sections', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('library tabs have stable paths and legacy routes redirect', async ({ page }) => {
        await page.goto('/library/local');
        await expect(page.getByRole('tab', { name: '本地书库' })).toHaveAttribute('aria-selected', 'true');

        await page.getByRole('tab', { name: '网络书库' }).click();
        await expect(page).toHaveURL('/library/network');
        await expect(page.getByRole('tab', { name: '网络书库' })).toHaveAttribute('aria-selected', 'true');

        await page.goto('/network');
        await expect(page).toHaveURL('/library/network');
        await page.goto('/library');
        await expect(page).toHaveURL('/library/local');
    });

    test('network empty states distinguish disabled plugins from missing sources', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, networkSourceState: 'no_enabled_plugins' },
        });
        await page.goto('/library/network');
        await expect(page.getByText('尚未启用任何书源插件。启用插件后即可在这里浏览网络书库。')).toBeVisible();
        await expect(page.getByRole('link', { name: '前往插件设置' })).toHaveAttribute('href', '/admin/settings/plugins');

        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, networkSourceState: 'no_configured_sources' },
        });
        await page.reload();
        await expect(page.getByText('书源插件已启用，但尚未配置可用书源。')).toBeVisible();
    });

    test('guests may read app introductions but not instance connection details', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true, loggedIn: false } });
        await page.goto('/library/apps');

        await expect(page.getByText('登录后可查看当前实例的连接地址和服务状态。')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Moke' })).toBeVisible();
        await expect(page.locator('.app-access-card__connection')).toHaveCount(0);

        await page.goto('/me/shelf');
        await expect(page).toHaveURL(/\/login\?next=\/me\/shelf$/);
    });

    test('admin settings tabs replace standalone plugin and theme entries', async ({ page }) => {
        await page.goto('/admin/settings/general');
        await expect(page.getByRole('tab', { name: '实例设置' })).toHaveAttribute('aria-selected', 'true');
        await page.getByRole('tab', { name: '插件中心' }).click();
        await expect(page).toHaveURL('/admin/settings/plugins');
        await expect(page.getByRole('navigation', { name: '插件分类' })).toBeVisible();
        await page.getByRole('tab', { name: '主题管理' }).click();
        await expect(page).toHaveURL('/admin/settings/themes');

        await page.goto('/admin/plugins');
        await expect(page).toHaveURL('/admin/settings/plugins');
        await page.goto('/admin/themes');
        await expect(page).toHaveURL('/admin/settings/themes');
    });

    test('route tabs stay docked and scroll horizontally on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 720 });
        await page.goto('/me/history');
        let routeTabs = page.locator('.route-tab-shell__nav');
        await expect(routeTabs).toBeVisible();

        const canScroll = await routeTabs.locator('.v-slide-group__container').evaluate((element) => {
            return element.scrollWidth > element.clientWidth;
        });
        expect(canScroll).toBe(true);

        await page.goto('/admin/settings/general');
        routeTabs = page.locator('.route-tab-shell__nav');
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
        await expect.poll(async () => {
            return routeTabs.evaluate(element => Math.round(element.getBoundingClientRect().top));
        }).toBeLessThanOrEqual(50);
    });
});
