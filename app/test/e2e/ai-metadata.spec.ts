import path from 'node:path';
import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test('AI metadata review renders bounded opening-excerpt evidence', async ({ page, request }) => {
    await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin/books');
    await expect(page.locator('.loading-page')).toBeHidden();

    await page.locator('tbody input[type="checkbox"]').first().click({ force: true });
    const openButton = page.getByRole('button', { name: /AI 元数据预览/ });
    await expect(openButton).toContainText('(1)');
    await openButton.click();

    const dialog = page.getByRole('dialog').filter({ hasText: 'AI 元数据 2.0' }).first();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('书籍开头 1000 字');
    await expect(dialog).toContainText('南海出版公司');
    await expect(dialog).toContainText('ISBN 978-7-5442-5399-4');

    const screenshotPath = process.env.AI_METADATA_SCREENSHOT_PATH
        || path.resolve('test-results/ai-metadata-review.png');
    await page.screenshot({ path: screenshotPath });
});
