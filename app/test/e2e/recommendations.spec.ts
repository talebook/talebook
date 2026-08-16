import { expect, test, type Page } from '@playwright/test';

const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

const openRecommendations = async (page: Page) => {
    await page.goto('/recommendations', { waitUntil: 'domcontentloaded' });
    const heading = page.getByRole('heading', { name: '猜你喜欢', level: 1 });
    try {
        await expect(heading).toBeVisible({ timeout: 3000 });
    } catch (_error) {
        // Vite may reload the first page once after optimizing a new dependency.
        await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await expect(heading).toBeVisible({ timeout: 10000 });
};

test.describe('Explainable recommendations', () => {
    test.beforeEach(async ({ request }) => {
        const response = await request.post(`${mockApiUrl}/_test/reset`, { data: { installed: true } });
        expect(response.ok()).toBeTruthy();
    });

    test('shows grounded cards, fallback disclosure, and cold-start controls', async ({ page }) => {
        await openRecommendations(page);
        await expect(page.getByTestId('recommendation-fallback')).toBeVisible();
        await expect(page.getByTestId('recommendation-card')).toHaveCount(4);
        await expect(page.getByLabel('推荐依据').first()).toBeVisible();
        await expect(page.getByText('使用我的阅读与收藏行为')).toBeVisible();
        await expect(page.getByLabel('想读的主题')).toBeVisible();
    });

    test('applies feedback immediately and supports short undo', async ({ page }) => {
        await openRecommendations(page);
        const cards = page.getByTestId('recommendation-card');
        await expect(cards).toHaveCount(4);
        await cards.first().getByRole('button', { name: '调整' }).click();
        await page.getByText('不感兴趣', { exact: true }).click();
        await expect(cards).toHaveCount(3);
        await expect(page.getByText('已减少这本书的推荐')).toBeVisible();
        await page.getByRole('button', { name: '撤销' }).click();
        await expect(cards).toHaveCount(4);
    });

    test('keeps the recommendation layout usable on a narrow screen', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 720 });
        await openRecommendations(page);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow).toBeLessThanOrEqual(1);
        await expect(page.getByRole('button', { name: '换一批' })).toBeVisible();
        await expect(page.getByRole('button', { name: '刷新推荐' })).toBeVisible();
    });
});
