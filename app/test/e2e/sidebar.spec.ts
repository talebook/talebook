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

    test('keeps aggregate entries selected across their child tabs', async ({ page }) => {
        const cases = [
            ['/library/network', '/library/local'],
            ['/library/apps', '/library/local'],
            ['/me/history', '/me/shelf'],
            ['/me/devices', '/me/shelf'],
            ['/me/plugins', '/me/shelf'],
            ['/admin/settings/plugins', '/admin/settings/general'],
            ['/admin/settings/themes', '/admin/settings/general'],
        ];

        for (const [path, navigationHref] of cases) {
            await page.goto(path);
            const navigationItem = page.locator(`.v-navigation-drawer a[href="${navigationHref}"]`);
            await expect(navigationItem).toHaveClass(/v-list-item--active/);
            if (path.startsWith('/admin/')) {
                await expect(navigationItem).toBeVisible();
                await expect(page.locator('.app-navigation-group .v-list-group__items')).toBeVisible();
            }
        }
    });

    test('keeps configured friendship links outside the help menu', async ({ page }) => {
        await page.goto('/');
        const trigger = page.locator('.sidebar-help__trigger');
        await expect(trigger).toBeVisible();
        await expect(trigger.locator('.v-btn__underlay')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        await trigger.click();

        const menu = page.locator('.sidebar-help__card');
        await expect(menu.getByText('更新日志')).toBeVisible();
        await expect(menu.getByText('GitHub')).toBeVisible();
        await expect(menu.getByText('反馈')).toBeVisible();
        await expect(menu.getByText(/系统版本 1\.0\.0/)).toBeVisible();
        await expect(menu.getByText(/用户数 5/)).toBeVisible();
        await expect(menu.getByText('文档')).toHaveCount(0);
        const logo = menu.getByTestId('sidebar-help-logo');
        const version = menu.getByTestId('sidebar-help-version');
        const users = menu.getByTestId('sidebar-help-users');
        await expect(logo).toBeVisible();
        await expect(version).toHaveClass(/v-list-item/);
        await expect(users).toHaveClass(/v-list-item/);
        await expect(menu.locator('.sidebar-help__item').first()).toHaveCSS('font-size', '13px');
        await expect(
            menu.locator('.sidebar-help__item').first().locator('.v-list-item__prepend .v-list-item__spacer'),
        ).toHaveCSS('width', '8px');

        const logoImage = logo.locator('img');
        await expect(logoImage).toHaveCSS('width', '180px');
        await expect(logoImage).toHaveCSS('height', '180px');
        await expect.poll(async () => Math.round((await logoImage.boundingBox())?.width || 0)).toBe(180);
        const logoBox = await logo.boundingBox();
        const logoImageBox = await logoImage.boundingBox();
        const firstItemBox = await menu.locator('.sidebar-help__item').first().boundingBox();
        expect(logoBox).not.toBeNull();
        expect(logoImageBox).not.toBeNull();
        expect(firstItemBox).not.toBeNull();
        expect(logoImageBox!.width).toBe(180);
        expect(logoImageBox!.height).toBe(180);
        expect(Math.abs((logoImageBox!.x + 90) - (logoBox!.x + logoBox!.width / 2))).toBeLessThanOrEqual(1);
        expect(logoBox!.y + logoBox!.height).toBeLessThanOrEqual(firstItemBox!.y);

        const drawerBox = await page.locator('.app-navigation-drawer').boundingBox();
        expect(drawerBox).not.toBeNull();
        await expect.poll(async () => {
            const currentMenuBox = await menu.boundingBox();
            return currentMenuBox?.x ?? Number.POSITIVE_INFINITY;
        }).toBeLessThanOrEqual(drawerBox!.x + 16);
    });

    test('scrolls a long expanded admin menu without pushing out help', async ({ page }) => {
        await page.setViewportSize({ width: 1100, height: 620 });
        await page.goto('/admin/settings/general');

        const group = page.locator('.app-navigation-group');
        const activator = group.locator(':scope > .v-list-item');
        if (await activator.getAttribute('aria-expanded') !== 'true') {
            await activator.click();
        }

        const drawer = page.locator('.app-navigation-drawer');
        const list = page.locator('.app-navigation-list');
        const help = page.locator('.sidebar-help');
        await expect(list).toHaveCSS('overflow-y', 'auto');
        await expect.poll(async () => list.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);

        const drawerBox = await drawer.boundingBox();
        const listBox = await list.boundingBox();
        const helpBox = await help.boundingBox();
        expect(drawerBox).not.toBeNull();
        expect(listBox).not.toBeNull();
        expect(helpBox).not.toBeNull();
        expect(listBox!.y + listBox!.height).toBeLessThanOrEqual(helpBox!.y + 1);
        expect(helpBox!.y + helpBox!.height).toBeLessThanOrEqual(drawerBox!.y + drawerBox!.height + 1);
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
