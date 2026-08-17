
import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiIndex = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_index.json'), 'utf-8'));
const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

const openHome = async (page: Page) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const recent = page.getByText('新书推荐');
    try {
        await expect(recent).toBeVisible({ timeout: 3000 });
    } catch (_error) {
        // Vite may reload once after optimizing a newly imported component.
        await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await expect(recent).toBeVisible({ timeout: 10000 });
};

test.describe('Homepage', () => {
    test.beforeEach(async ({ request }) => {
    // Reset mock server to installed state
        const response = await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true }
        });
        expect(response.ok()).toBeTruthy();
    });

    // No page.route here, relying on real mock server

    test('displays personalized and recent books for a logged-in reader', async ({ page }) => {
        await openHome(page);

        await expect(page.getByRole('heading', { name: '猜你喜欢', level: 2 })).toBeVisible();
        await expect(page.getByTestId('home-recommendation-card')).toHaveCount(
            Math.min(12, apiIndex.random_books.length)
        );
        await expect(page.getByText('新书推荐')).toBeVisible();
        await expect(page.getByText('分类浏览').first()).toBeVisible();

        // Check navigation links
        await expect(page.getByText('分类导览').first()).toBeVisible();
        await expect(page.getByText('作者').first()).toBeVisible();
        await expect(page.getByText('出版社').first()).toBeVisible();

        // The personalized module still links to books from the accessible library.
        if (apiIndex.random_books.length > 0) {
            const firstBook = apiIndex.random_books[0];
            // We can check if there are links to the books.
            await expect(page.locator(`a[href^="/book/${firstBook.id}"]`).first()).toBeVisible();
        }

        // Check if at least one book from new books is visible
        if (apiIndex.new_books.length > 0) {
            const firstNewBook = apiIndex.new_books[0];
            // Recent books use BookCards component, which likely displays titles.
            await expect(page.getByText(firstNewBook.title).first()).toBeVisible();
        }
    });

    test('keeps recommendation modes behind a subtle options control', async ({ page }) => {
        await openHome(page);

        await expect(page.getByText('参考我的笔记')).toBeHidden();
        await page.getByTestId('recommendation-options').click();
        await expect(page.getByRole('dialog', { name: '推荐依据' })).toBeVisible();
        await expect(page.getByText('参考我的历史阅读')).toBeVisible();
        await expect(page.getByText('参考大家喜欢')).toBeVisible();
        await expect(page.getByText('参考我的笔记')).toBeVisible();
        await expect(page.getByText('书库暂时没有可用于推荐的通用笔记索引')).toBeVisible();
        const popular = page.getByRole('checkbox', { name: '参考大家喜欢' });
        const [saved] = await Promise.all([
            page.waitForResponse(response => (
                response.url().endsWith('/api/ai/recommendations/preferences')
                && response.request().method() === 'PATCH'
            )),
            popular.uncheck(),
        ]);
        expect(saved.ok()).toBeTruthy();
        expect(saved.request().postDataJSON()).toMatchObject({ popular_enabled: false });
        await expect(popular).not.toBeChecked();

        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByTestId('recommendation-options').click();
        await expect(page.getByRole('checkbox', { name: '参考大家喜欢' })).not.toBeChecked();
    });

    test('keeps the options popover reachable by keyboard at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 720 });
        await openHome(page);

        const options = page.getByTestId('recommendation-options');
        await expect(options).toHaveAttribute('aria-haspopup', 'dialog');
        await options.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog', { name: '推荐依据' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByText('参考我的历史阅读')).toBeVisible();
        await expect(dialog.getByText('参考大家喜欢')).toBeVisible();

        await expect.poll(async () => (await dialog.boundingBox())?.width).toBeGreaterThanOrEqual(280);
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox).not.toBeNull();
        expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
        expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(320);
        expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
        expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(720);
        expect(await page.evaluate(() => (
            document.documentElement.scrollWidth - document.documentElement.clientWidth
        ))).toBeLessThanOrEqual(1);

        await page.keyboard.press('Tab');
        await expect(page.getByRole('checkbox', { name: '参考我的历史阅读' })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(options).toBeFocused();
    });

    test('keeps the original random module for guests', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true, loggedIn: false }
        });
        await page.goto('/');

        await expect(page.getByText('推荐', { exact: true }).first()).toBeVisible();
        await expect(page.getByTestId('home-recommendations')).toHaveCount(0);
    });

    test('keeps every recent book card at the fixed shelf height', async ({ page }) => {
        await page.goto('/');

        const cards = page.getByTestId('book-card');
        await expect(cards).toHaveCount(apiIndex.new_books.length);
        await expect(cards.first()).toBeVisible();

        const heights = await cards.evaluateAll(elements =>
            elements.map(element => Math.round(element.getBoundingClientRect().height))
        );
        expect([...new Set(heights)]).toEqual([150]);
    });

    test('keeps each cover at its original ratio through the bottom edge of its card', async ({ page }) => {
        await page.goto('/');

        const cardWithCover = page.getByTestId('book-card').filter({
            has: page.getByTestId('book-cover'),
        }).first();
        await expect(cardWithCover).toBeVisible();

        const cardBox = await cardWithCover.boundingBox();
        const coverBox = await cardWithCover.getByTestId('book-cover').boundingBox();

        expect(cardBox).not.toBeNull();
        expect(coverBox).not.toBeNull();
        expect(Math.round(coverBox!.y + coverBox!.height)).toBe(
            Math.round(cardBox!.y + cardBox!.height)
        );
        expect(coverBox!.width / coverBox!.height).toBeCloseTo(11 / 15, 2);
        await expect(cardWithCover.getByTestId('book-cover').locator('img')).toHaveCSS(
            'object-fit',
            'contain'
        );
    });

    test('uses an ambient shadow that is visible above each card', async ({ page }) => {
        await page.goto('/');

        const cards = page.getByTestId('book-card');
        await expect(cards.first()).toBeVisible();

        const shadows = await cards.evaluateAll(elements =>
            elements.map(element => getComputedStyle(element).boxShadow)
        );
        expect(shadows).not.toContain('none');
        expect(shadows.every(shadow => /0px 0px 6px/.test(shadow))).toBe(true);
    });

    test('shows the read badge on books marked as finished', async ({ page }) => {
        await page.goto('/');

        const finishedBook = page.locator('a[href="/book/1"]').filter({
            has: page.locator('.book-read-badge'),
        }).first();
        await expect(finishedBook.locator('.book-read-badge')).toBeVisible();
        await expect(finishedBook.locator('.book-read-badge')).toHaveAttribute('title', '已读');
    });

    test('shows the read badge and chip in the library list', async ({ page }) => {
        await page.goto('/library');

        const finishedBook = page.locator('a[href="/book/1"]').first();
        await expect(finishedBook.locator('.book-read-badge')).toBeVisible();
        await expect(finishedBook.getByText('已读', { exact: true })).toBeVisible();
    });
});
