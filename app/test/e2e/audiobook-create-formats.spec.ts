import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.beforeAll(async ({ browser, baseURL }) => {
    const warmup = await browser.newPage();
    try {
        await warmup.goto(baseURL || 'http://127.0.0.1:3009/');
        try {
            await expect(warmup.locator('.v-main')).toBeVisible({ timeout: 10000 });
        } catch {
            // Match the project's existing cold-start handling: HTTP readiness
            // can precede the first client compilation/hydration completing.
            await warmup.reload();
            await expect(warmup.locator('.v-main')).toBeVisible({ timeout: 45000 });
        }
    } finally {
        await warmup.close();
    }
});

for (const scenario of [
    { id: 1, format: 'EPUB', summary: 'PDF', supported: true },
    { id: 2, format: 'TXT', summary: null, supported: true },
    { id: 3, format: 'MOBI', summary: 'EPUB', supported: false },
]) {
    test(`wizard uses ${scenario.format} detail when library summary has incomplete formats`, async ({ page, request, context }) => {
        await request.post('http://127.0.0.1:8089/_test/reset', { data: { installed: true } });
        if (scenario.id === 2) {
            await context.addCookies([{ name: 'theme', value: 'dark', url: 'http://127.0.0.1:3009' }]);
            await page.setViewportSize({ width: 320, height: 760 });
        }
        await page.route('**/api/library?*', async (route) => {
            const response = await route.fetch();
            const lines = (await response.text()).trim().split('\n').map((line) => {
                const row = JSON.parse(line);
                if (row.id) {
                    delete row.available_formats;
                    delete row.files;
                    if (scenario.summary) row.available_formats = [scenario.summary];
                }
                return JSON.stringify(row);
            });
            await route.fulfill({ response, body: `${lines.join('\n')}\n` });
        });
        await page.goto(`/audios/create?book=${scenario.id}`);
        await expect(page.getByTestId(`select-audiobook-book-${scenario.id}`)).toBeVisible({ timeout: 45000 });
        const panel = page.getByTestId('selected-book-panel');
        await expect(panel).toContainText(scenario.format);
        await expect(page.getByTestId(`select-audiobook-book-${scenario.id}`)).toContainText(scenario.format);
        if (scenario.supported) {
            await expect(page.getByTestId('submit-create-wizard')).toBeEnabled();
            await expect(page.getByTestId(`wizard-book-status-${scenario.id}`)).toContainText('可创建');
            await expect(page.getByTestId('create-wizard-unsupported-format')).toHaveCount(0);
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            const folder = resolve('../document/audiobook-progress-v2-review/attempt-registration');
            mkdirSync(folder, { recursive: true });
            await page.screenshot({ path: resolve(folder, `wizard-${scenario.format.toLowerCase()}.png`), fullPage: true });
            const created = page.waitForResponse(response => response.url().endsWith(`/api/book/${scenario.id}/audio-jobs`) && response.request().method() === 'POST');
            await page.getByTestId('submit-create-wizard').click();
            expect((await (await created).json()).err).toBe('ok');
            await expect(page).toHaveURL(/\/audio-job\/1$/);
        } else {
            await expect(page.getByTestId('create-wizard-unsupported-format')).toBeVisible();
            await expect(page.getByTestId('submit-create-wizard')).toHaveCount(0);
            await expect(page.getByTestId('convert-selected-book')).toHaveAttribute('href', '/book/3?convert=epub');
        }
    });
}
