import { test, expect, type Page } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

async function expectTitleRouteTabs(page: Page) {
    const routeTabs = page.locator('.route-tab-shell__nav');
    const activeTab = routeTabs.getByRole('tab', { selected: true });
    const inactiveTab = routeTabs.getByRole('tab', { selected: false }).first();

    await expect(activeTab).toHaveCSS('font-size', '24px');
    await expect(inactiveTab).toHaveCSS('font-size', '16px');
    await expect(inactiveTab).toHaveCSS('font-weight', '600');
    await expect(routeTabs).toHaveCSS('border-bottom-width', '1px');

    const visibleIndicatorGap = await activeTab.evaluate((element) => {
        const content = element.querySelector('.v-btn__content')?.getBoundingClientRect();
        const slider = element.querySelector('.v-tab__slider')?.getBoundingClientRect();
        if (!content || !slider) return null;
        return Math.round(slider.top - content.bottom);
    });
    expect(visibleIndicatorGap).toBe(8);
}

test.describe('Route-backed navigation sections', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('library tabs have stable paths and legacy routes redirect', async ({ page }) => {
        await page.goto('/library/local');
        await expect(page.getByRole('tab', { name: '本地书库' })).toHaveAttribute('aria-selected', 'true');
        await expectTitleRouteTabs(page);
        await expect(page.locator('.route-tab-shell__description')).toHaveCount(0);
        await expect(page.locator('.route-page-toolbar')).toHaveCount(1);
        await expect(page.getByRole('heading', { name: '书库', exact: true })).toHaveCount(0);
        await expect(page.getByText('浏览、筛选和管理已收藏到 Talebook 的本地书籍。')).toBeVisible();

        await page.getByRole('tab', { name: '网络书库' }).click();
        await expect(page).toHaveURL('/library/network');
        await expect(page.getByRole('tab', { name: '网络书库' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('搜索和浏览已启用书源插件提供的在线书籍。')).toBeVisible();
        await expect(page.getByRole('link', { name: '管理书源' })).toHaveAttribute('href', '/plugins/legado');

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
        await expect(page.getByText('查看 Moke、OPDS 与 WebDAV 的访问地址和配置指引。')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Moke' })).toBeVisible();
        await expect(page.locator('.app-access-card__connection')).toHaveCount(0);

        await page.goto('/me/shelf');
        await expect(page).toHaveURL(/\/login\?next=\/me\/shelf$/);
    });

    test('admin settings tabs replace standalone plugin and theme entries', async ({ page }) => {
        await page.goto('/admin/settings/general');
        await expect(page.getByRole('tab', { name: '系统设置' })).toHaveAttribute('aria-selected', 'true');
        await expectTitleRouteTabs(page);
        await expect(page.getByText('管理当前 Talebook 实例的全局设置。')).toBeVisible();
        const titlebarBox = await page.locator('.settings-titlebar').boundingBox();
        const settingsBodyBox = await page.locator('.settings-body').boundingBox();
        expect(Math.round(settingsBodyBox!.x)).toBe(Math.round(titlebarBox!.x));
        expect(Math.round(settingsBodyBox!.width)).toBe(Math.round(titlebarBox!.width));
        await page.getByRole('tab', { name: '插件中心' }).click();
        await expect(page).toHaveURL('/admin/settings/plugins');
        await expect(page.getByText('控制本实例可用的内置插件，并维护全局设置。个人账号、密钥与设备由各用户自行配置。')).toBeVisible();
        await expect(page.getByRole('heading', { name: '插件', exact: true })).toHaveCount(0);
        await expect(page.locator('.plugin-page-toolbar')).toBeVisible();
        await expect(page.locator('.route-tab-shell__description')).toHaveCount(0);
        await expect(page.locator('.plugin-page')).toHaveCSS('max-width', 'none');
        await expect(page.locator('.plugin-page')).toHaveCSS('padding-left', '0px');
        await expect(page.getByRole('navigation', { name: '插件分类' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '个人配置' })).toHaveCount(0);
        await page.getByRole('tab', { name: '主题管理' }).click();
        await expect(page).toHaveURL('/admin/settings/themes');
        await expect(page.getByText('选择和启用 Talebook 的界面主题。')).toBeVisible();
        await expect(page.locator('.theme-page-head')).toHaveCount(0);

        await page.goto('/admin/plugins');
        await expect(page).toHaveURL('/admin/settings/plugins');
        await page.goto('/admin/themes');
        await expect(page).toHaveURL('/admin/settings/themes');
    });

    test('moves personal plugin settings into My Reading', async ({ page }) => {
        await page.goto('/me/plugins');
        await expect(page.getByRole('tab', { name: '个人插件设置' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('管理当前账号使用的插件连接与账号绑定。')).toBeVisible();
        await expect(page.getByText('配置当前账号使用的外部服务、同步连接和阅读设备。')).toHaveCount(0);
        await expect(page.locator('.personal-row').filter({ hasText: '微信读书' })).toBeVisible();

        await page.goto('/plugins');
        await expect(page).toHaveURL('/me/plugins');
        await page.goto('/admin/settings/plugins?section=personal');
        await expect(page).toHaveURL('/me/plugins');
    });

    test('promotes account profile and reading devices to route tabs', async ({ page }) => {
        await page.goto('/me/account');
        await expect(page.getByRole('tab', { name: '基本信息' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('管理个人资料和登录密码。')).toBeVisible();
        await expect(page.locator('.route-tab-shell__nav').getByRole('tab')).toHaveCount(6);
        await expect(page.locator('.v-tabs')).toHaveCount(1);

        await page.getByRole('tab', { name: '阅读设备' }).click();
        await expect(page).toHaveURL('/me/devices');
        await expect(page.getByRole('tab', { name: '阅读设备' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('管理当前账号用于接收和推送书籍的阅读设备。')).toBeVisible();
        await expect(page.getByRole('button', { name: '添加' })).toBeVisible();
        await expect(page.locator('.device-settings-card')).toHaveCSS('padding-top', '24px');
        await expect(page.locator('.v-tabs')).toHaveCount(1);

        await page.goto('/me/account?tab=devices');
        await expect(page).toHaveURL('/me/devices');
        await page.goto('/user/detail?tab=devices');
        await expect(page).toHaveURL('/me/devices');
    });

    test('keeps reading device fields visible and reachable at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/me/devices');
        await page.getByRole('button', { name: '添加' }).click();

        const deviceCard = page.locator('.device-settings-card');
        await expect(deviceCard.getByRole('textbox', { name: '名称' }).first()).toBeVisible();
        await expect(deviceCard.getByRole('combobox', { name: '类型', exact: true })).toBeVisible();
        await expect(deviceCard.getByRole('button', { name: '删除设备' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

        const cardBox = await deviceCard.boundingBox();
        const labels = deviceCard.locator('.v-field-label');
        for (let index = 0; index < await labels.count(); index += 1) {
            const labelBox = await labels.nth(index).boundingBox();
            expect(labelBox!.y).toBeGreaterThanOrEqual(cardBox!.y);
        }
    });

    test('route tabs stay docked and scroll horizontally on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 720 });
        await page.goto('/me/history');
        let routeTabs = page.locator('.route-tab-shell__nav');
        await expect(routeTabs).toBeVisible();
        await expectTitleRouteTabs(page);
        await expect(page.getByText('查看正在阅读、已读书目与历史阅读记录。')).toBeVisible();

        const canScroll = await routeTabs.locator('.v-slide-group__container').evaluate((element) => {
            return element.scrollWidth > element.clientWidth;
        });
        expect(canScroll).toBe(true);
        await expect(routeTabs.locator('.v-slide-group__prev, .v-slide-group__next')).toHaveCount(0);
        const activeTab = routeTabs.getByRole('tab', { selected: true });
        await activeTab.focus();
        await page.keyboard.press('ArrowRight');
        await expect(routeTabs.getByRole('tab', { name: '基本信息' })).toBeFocused();

        await page.goto('/admin/settings/general');
        routeTabs = page.locator('.route-tab-shell__nav');
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight }));
        await expect.poll(async () => {
            return routeTabs.evaluate(element => Math.round(element.getBoundingClientRect().top));
        }).toBeLessThanOrEqual(50);
    });

    test('personal private books do not repeat the route tab title', async ({ page }) => {
        await page.goto('/me/private');
        await expect(page.getByRole('tab', { name: '私有书籍' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByText('查看仅自己可见的私有书籍。')).toBeVisible();
        await expect(page.getByRole('heading', { name: '私有书籍', exact: true })).toHaveCount(0);
    });
});
