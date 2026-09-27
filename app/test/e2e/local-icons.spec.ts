import { expect, test } from '@playwright/test';
import { mdiFileRestoreOutline, mdiFindReplace, mdiTranslate } from '@mdi/js';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Local SVG icons', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true },
        });
    });

    for (const viewport of [
        { name: 'desktop', width: 1280, height: 900, theme: 'light' },
        { name: 'mobile', width: 390, height: 844, theme: 'light' },
        { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
    ]) {
        test(`renders historical tool icons in the plugin center (${viewport.name})`, async ({ page }, testInfo) => {
            const errors: string[] = [];
            page.on('pageerror', error => errors.push(error.message));
            // The shared mock catalog only includes TXT repair. Add the other
            // two real provider declarations at the API boundary, not in the DOM.
            await page.route('**/api/admin/plugins', async (route) => {
                const response = await route.fetch();
                const catalog = await response.json();
                const txt = catalog.definitions.find((item: { plugin_key: string }) => item.plugin_key === 'talebook.tool.txt-fixer');
                const installation = catalog.installations.find((item: { plugin_key: string }) => item.plugin_key === txt.plugin_key);
                for (const [id, key, name, icon, description] of [
                    [101, 'text-replace', '正文查找替换', 'mdi-find-replace', '在书籍正文中查找并替换文本。'],
                    [102, 'zh-converter', '繁简转换', 'mdi-translate', '转换书籍正文的简体与繁体中文。'],
                ] as const) {
                    const definition = { ...txt, id, plugin_key: `talebook.tool.${key}`, name, description, ui: { icon, manage_route: `/plugins/${key}` } };
                    catalog.definitions.push(definition);
                    catalog.installations.push({ ...installation, id, plugin_key: definition.plugin_key, definition });
                }
                await route.fulfill({ response, json: catalog });
            });
            await page.setViewportSize(viewport);
            await page.context().addCookies([{ name: 'theme', value: viewport.theme, url: testInfo.project.use.baseURL as string }]);
            await page.goto('/admin/settings/plugins');
            const tools = page.locator('#plugin-group-tool');
            await expect(tools.locator('.management-row')).toHaveCount(3, { timeout: 30000 });
            for (const [name, path] of [
                ['正文查找替换', mdiFindReplace],
                ['繁简转换', mdiTranslate],
                ['TXT 编码修复', mdiFileRestoreOutline],
            ]) {
                const row = tools.locator('.management-row').filter({ hasText: name });
                await expect(row.locator('.plugin-brand-icon svg path')).toHaveAttribute('d', path);
                await expect(row.locator('.plugin-brand-icon svg')).toBeVisible();
            }
            await tools.scrollIntoViewIfNeeded();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            expect(errors).toEqual([]);
            const screenshotPath = testInfo.outputPath(`plugin-center-${viewport.name}.png`);
            await page.screenshot({ path: screenshotPath });
            await testInfo.attach('plugin-center', { path: screenshotPath, contentType: 'image/png' });
        });
    }

    test('renders mobile navigation icons without font or icon CDN requests', async ({ page }, testInfo) => {
        const requestedUrls: string[] = [];
        const pageErrors: string[] = [];
        page.on('request', request => requestedUrls.push(request.url()));
        page.on('pageerror', error => pageErrors.push(error.message));

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/');
        await page.waitForTimeout(500);
        expect(pageErrors).toEqual([]);
        await expect(page.locator('.loading-page')).toBeHidden({ timeout: 15_000 });

        const icons = page.locator('.v-icon');
        await expect(icons.first()).toBeVisible();
        expect(await icons.count()).toBeGreaterThan(5);
        await expect(page.locator('.v-icon:not(:has(svg.v-icon__svg))')).toHaveCount(0);

        const fontResources = await page.evaluate(() => performance.getEntriesByType('resource')
            .filter(entry => (entry as PerformanceResourceTiming).initiatorType === 'font')
            .map(entry => entry.name));
        expect(fontResources).toEqual([]);
        expect(requestedUrls.filter(url => /(?:materialdesignicons|@mdi\/font|cdn\.jsdelivr\.net|fonts\.googleapis\.com)/.test(url))).toEqual([]);

        const screenshotPath = testInfo.outputPath('local-svg-icons-mobile.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        await testInfo.attach('local-svg-icons-mobile', { path: screenshotPath });
    });
});
