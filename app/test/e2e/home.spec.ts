
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

    test('displays random and recent books', async ({ page }) => {
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
