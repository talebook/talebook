import { test, expect } from '@playwright/test';


const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
const appBase = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';


test.describe('AI tag organizer', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('reviews, previews, confirms, and safely undoes a task', async ({ page }) => {
        await page.goto('/admin/tags');
        await expect(page.getByRole('heading', { name: '标签整理台' })).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('不会发送书籍正文')).toBeVisible();

        await page.getByRole('button', { name: '开始分析' }).click();
        await expect(page.getByRole('heading', { name: '审阅并调整建议' })).toBeVisible();
        await expect(page.getByText('sci-fi').first()).toBeVisible();
        await expect(page.getByText('置信度 93%')).toBeVisible();
        await expect(page.getByText('影响 2 本书')).toBeVisible();
        await expect(page).toHaveScreenshot('tag-organizer-review.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixels: 100,
        });

        await page.getByRole('button', { name: '生成变更预览' }).click();
        await expect(page.getByRole('heading', { name: '逐书变更预览' })).toBeVisible();
        await expect(page.getByText('星海纪事')).toBeVisible();
        await expect(page.getByText('未来简史')).toBeVisible();

        await page.getByLabel('我已核对影响书籍和标签变化，确认执行上述变更。').check();
        await page.getByRole('button', { name: '确认并执行' }).click();
        await expect(page.getByRole('heading', { name: '执行结果' })).toBeVisible();
        await expect(page.locator('.result-grid .success strong')).toHaveText('2');

        await page.getByRole('button', { name: '撤销本任务' }).click();
        await expect(page.getByText('撤销整次标签整理？')).toBeVisible();
        await page.getByRole('button', { name: '确认安全撤销' }).click();
        await expect(page.locator('.result-grid > div').nth(3).locator('strong')).toHaveText('2');
    });

    test('keeps the workflow readable on a narrow viewport', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto('/admin/tags');
        await expect(page.getByRole('heading', { name: '标签整理台' })).toBeVisible();
        const hero = await page.locator('.organizer-hero').boundingBox();
        expect(hero?.width).toBeLessThanOrEqual(320);
        await expect(page.getByRole('button', { name: '开始分析' })).toBeVisible();
    });

    test('renders the English copy in dark mode', async ({ context, page }) => {
        await context.addCookies([
            { name: 'theme', value: 'dark', url: appBase },
            { name: 'i18n_redirected', value: 'en-US', url: appBase },
        ]);
        await page.goto('/admin/tags');
        await expect(page.getByRole('heading', { name: 'Tag Organizer' })).toBeVisible();
        await expect(page.locator('.v-theme--dark').first()).toBeVisible();
        await expect(page.getByRole('button', { name: 'Analyze tags' })).toBeVisible();
    });
});
