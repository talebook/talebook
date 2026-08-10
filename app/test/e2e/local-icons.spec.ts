import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Local SVG icons', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true },
        });
    });

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
