import { test, expect } from '@playwright/test';

const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Comic reader', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true, loggedIn: true },
        });
    });

    test('restores progress, turns a page, saves progress, and exits', async ({ page }) => {
        await page.goto('/read-comic/14');

        const reader = page.locator('.kr-reader');
        await expect(reader).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('2 / 3', { exact: true })).toBeVisible();
        await expect(reader.locator('img').first()).toHaveAttribute('src', /\/api\/book\/14\/comic\/pages\/1\?revision=mock-revision/);

        const saved = page.waitForRequest(request => {
            if (!request.url().includes('/api/book/14/comic/progress') || request.method() !== 'POST') return false;
            const payload = request.postDataJSON();
            return payload.progress?.pageIndex === 2 && payload.progress?.completed === true;
        });
        await page.getByRole('button', { name: 'Next page' }).click();
        await saved;
        await expect(page.getByText('3 / 3', { exact: true })).toBeVisible();

        const pageMetrics = await page.evaluate(() => ({
            width: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            height: document.documentElement.clientHeight,
            scrollHeight: document.documentElement.scrollHeight,
        }));
        expect(pageMetrics.scrollWidth).toBeLessThanOrEqual(pageMetrics.width);
        expect(pageMetrics.scrollHeight).toBeLessThanOrEqual(pageMetrics.height);

        await page.getByRole('button', { name: 'Exit reader' }).click();
        await page.waitForURL('**/book/14');
    });

    test('shows a recoverable state for an unsupported or missing book', async ({ page }) => {
        await page.goto('/read-comic/999');

        await expect(page.getByRole('heading', { name: '无法打开漫画' })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('书籍不存在')).toBeVisible();
        await expect(page.getByRole('link', { name: '返回书籍详情' })).toHaveAttribute('href', '/book/999');
    });
});
