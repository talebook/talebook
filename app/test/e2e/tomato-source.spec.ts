import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

for (const theme of ['light', 'dark']) {
    test(`Tomato source configuration submits the selected format and numeric timeout (${theme})`, async ({ page, request }, testInfo) => {
        await page.context().addCookies([{ name: 'theme', value: theme, url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000' }]);
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
        await page.route('**/api/admin/plugins', async route => {
            const response = await route.fetch();
            const body = await response.json();
            body.definitions = body.definitions.filter(item => item.plugin_key !== 'talebook.source.tomato-downloader');
            const plugin = body.definitions.find(item => item.plugin_key === 'talebook.source.opds');
            Object.assign(plugin, {
                plugin_key: 'talebook.source.tomato-downloader',
                name: '番茄小说下载器',
                description: '搜索番茄小说或输入书籍 ID，下载完整 EPUB 或 TXT 到本地书库。需安装下载器，依赖上游在线服务。',
                config_schema: {
                    type: 'object', required: ['binary_path'], properties: {
                        binary_path: { type: 'string', default: '/opt/tomato/downloader' },
                        output_format: { type: 'string', enum: ['epub', 'txt'], default: 'epub' },
                        timeout_seconds: { type: 'number', default: 600, minimum: 5, maximum: 3600 },
                    },
                },
                auth_schema: { type: 'object', properties: {} },
                ui: { icon: 'mdi-bookshelf', configuration_mode: 'form', primary_action: 'configure' },
            });
            const installation = body.installations.find(item => item.plugin_key === 'talebook.source.opds');
            installation.plugin_key = plugin.plugin_key;
            installation.definition = plugin;
            await route.fulfill({ response, json: body });
        });
        await page.goto('/admin/plugins?tab=sources');
        const row = page.locator('.management-row').filter({ hasText: '番茄小说下载器' });
        await row.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog', { name: '番茄小说下载器' });
        await dialog.getByRole('button', { name: /配置/ }).first().click();
        await expect(dialog.getByLabel('下载器绝对路径')).toHaveValue('/opt/tomato/downloader');
        const format = dialog.getByRole('combobox', { name: '下载格式' });
        await expect(dialog.getByText('epub', { exact: true })).toBeVisible();
        await format.focus();
        await format.press('Enter');
        await page.getByRole('option', { name: 'txt', exact: true }).click();
        const timeout = dialog.getByLabel('操作超时时间（秒）');
        await expect(timeout).toHaveAttribute('type', 'number');
        await expect(timeout).toHaveAttribute('step', 'any');
        await timeout.fill('900');
        await page.screenshot({ path: testInfo.outputPath('tomato-config-desktop.png') });
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(timeout).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('tomato-config-mobile.png') });
        await page.setViewportSize({ width: 320, height: 740 });
        await expect(page.locator('.v-application')).toHaveClass(new RegExp(`v-theme--${theme}`));
        await expect(format).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('tomato-config-dark-mobile.png') });
        const submitted = page.waitForRequest(req => req.url().endsWith('/api/admin/plugins/connections') && req.method() === 'POST');
        await dialog.getByRole('button', { name: '保存', exact: true }).click();
        const config = (await submitted).postDataJSON().config;
        expect(config.timeout_seconds).toBe(900);
        expect(config.output_format).toBe('txt');
        await page.setViewportSize({ width: 375, height: 812 });
        await expect(dialog.getByRole('button', { name: '关闭' })).toBeVisible();
        await expect(dialog).toBeVisible();
        await page.unrouteAll({ behavior: 'wait' });
    });
}

test('search-only sources do not offer an unsupported browse operation', async ({ page, request }) => {
    await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    await page.route('**/api/book-sources', route => route.fulfill({ json: {
        err: 'ok', items: [{
            id: 'plugin:900', source_key: 'plugin:900', name: '番茄小说下载器',
            capabilities: ['sources.search', 'sources.acquire'], download_mode: 'single_book',
        }],
    } }));
    await page.goto('/network');
    await expect(page.getByText('共 1 个书源')).toBeVisible();
    await page.getByRole('tab', { name: '浏览', exact: true }).click();
    await expect(page.getByText('暂无支持分类浏览的书源，请切换到搜索。')).toBeVisible();
    await page.getByRole('tab', { name: '搜索', exact: true }).click();
    await expect(page.getByPlaceholder('输入书名或作者，回车搜索')).toBeVisible();
});
