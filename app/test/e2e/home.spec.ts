
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiIndex = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_index.json'), 'utf-8'));
const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Homepage', () => {
    test.beforeEach(async ({ request }) => {
    // Reset mock server to installed state
        const response = await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true }
        });
        expect(response.ok()).toBeTruthy();
    });

    // No page.route here, relying on real mock server

    test('displays recommended and recent books', async ({ page }) => {
        await page.goto('/');

        // Check headers（首页“推荐”板块标题来自 navigation.recommended）
        await expect(page.getByText('推荐', { exact: true }).first()).toBeVisible();
        await expect(page.getByText('新书推荐')).toBeVisible();
        await expect(page.getByText('分类浏览').first()).toBeVisible();

        // Check navigation links
        await expect(page.getByText('分类导览').first()).toBeVisible();
        await expect(page.getByText('作者').first()).toBeVisible();
        await expect(page.getByText('出版社').first()).toBeVisible();

        // Check if at least one book from random books is visible
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

    test('preserves recommendation order supplied by the backend', async ({ page, request }) => {
        const books = [...apiIndex.random_books].reverse();
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { indexData: { ...apiIndex, random_books: books, visible_books_count: 30 } }
        });
        await page.goto('/');
        const cards = page.locator('.book-card a');
        await expect(cards).toHaveCount(books.length);
        expect(await cards.evaluateAll(elements => elements.map(element => element.getAttribute('href'))))
            .toEqual(books.map(book => `/book/${book.id}`));
    });

    test('distinguishes no unread recommendations from an empty library', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { indexData: { ...apiIndex, random_books: [], visible_books_count: 30 } }
        });
        await page.goto('/');
        await expect(page.getByText('暂无未读书籍推荐')).toBeVisible();
        await expect(page.getByText('本书库暂无藏书')).toHaveCount(0);
        await expect(page.getByText(apiIndex.new_books[0].title).first()).toBeVisible();
        await page.screenshot({ path: 'test-results/home-no-unread-recommendations.png', fullPage: true });
    });

    test('shows the library empty state when there are no visible books', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { indexData: { ...apiIndex, random_books: [], new_books: [], visible_books_count: 0 } }
        });
        await page.goto('/');
        await expect(page.getByText('本书库暂无藏书')).toBeVisible();
        await expect(page.getByText('请先添加书籍到书库')).toBeVisible();
        await expect(page.getByText('暂无未读书籍推荐')).toHaveCount(0);
    });

    test('hides recommendations when disabled and keeps recent books', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { indexData: { ...apiIndex, random_books: [], recommendations_enabled: false } }
        });
        await page.goto('/');
        await expect(page.locator('.book-card')).toHaveCount(0);
        await expect(page.getByText('本书库暂无藏书')).toHaveCount(0);
        await expect(page.getByText(apiIndex.new_books[0].title).first()).toBeVisible();
    });

    test('refreshes recommendations when returning to the homepage', async ({ page, request }) => {
        await page.goto('/');
        await expect(page.locator('.book-card a').first()).toBeVisible();
        await page.locator('a[href="/recent"]').first().click();
        await expect(page).toHaveURL(/\/recent/);
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { indexData: { ...apiIndex, random_books: [], visible_books_count: 30 } }
        });
        await page.locator('a[href="/"]').first().click();
        await expect(page.getByText('暂无未读书籍推荐')).toBeVisible();
    });

    for (const theme of ['light', 'dark']) {
        test(`keeps the new empty state readable at 320px in ${theme} theme`, async ({ page, request }) => {
            await page.setViewportSize({ width: 320, height: 720 });
            await page.context().addCookies([{ name: 'theme', value: theme, url: 'http://127.0.0.1:9000' }]);
            await request.post(`${mockApiUrl}/_test/reset`, {
                data: { indexData: { ...apiIndex, random_books: [], visible_books_count: 30 } }
            });
            await page.goto('/');
            const heading = page.getByText('暂无未读书籍推荐');
            await expect(heading).toBeVisible();
            await expect(page.locator(`.v-application.v-theme--${theme}`)).toBeVisible();
            const box = await heading.boundingBox();
            expect(box!.x).toBeGreaterThanOrEqual(0);
            expect(box!.x + box!.width).toBeLessThanOrEqual(320);
        });
    }

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

        const finishedBook = page.locator('a[href="/book/1"]').first();
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
