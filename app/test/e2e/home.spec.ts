
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
        await expect.poll(() => cards.evaluateAll(elements => elements.map(element => element.getAttribute('href'))))
            .toEqual(books.map(book => `/book/${book.id}`));
    });

    for (const theme of ['light', 'dark']) {
        for (const width of [320, 600, 768, 960, 1280, 1920, 2560]) {
            test(`shows readable recommendation cards at ${width}px in ${theme} theme`, async ({ page, request }) => {
                const titles = [
                    '三体',
                    '这是一本书名很长的推荐书籍：封面下面应该显示两行书名并保留完整名称',
                    'AnUnbrokenEnglishBookTitleThatMustWrapWithoutWideningTheRecommendationCard',
                ];
                const books = titles.map((title, index) => ({
                    ...apiIndex.random_books[index],
                    title,
                    comments: index === 1 ? '这是一段需要截成两行的很长的书籍简介。'.repeat(8) : '简短简介。',
                }));
                await request.post(`${mockApiUrl}/_test/reset`, {
                    data: { indexData: { ...apiIndex, random_books: books } }
                });
                await page.setViewportSize({ width, height: 900 });
                await page.context().addCookies([{ name: 'theme', value: theme, url: 'http://127.0.0.1:9000' }]);
                await page.goto('/');

                const cards = page.getByTestId('recommendation-book-card');
                await expect(cards).toHaveCount(books.length);
                await expect(page.locator(`.v-application.v-theme--${theme}`)).toBeVisible();
                for (const [index, title] of titles.entries()) {
                    const card = cards.nth(index);
                    await expect(card.getByTestId('book-card-title')).toHaveText(title);
                    await expect(card.getByTestId('book-card-title')).toHaveAttribute('title', title);
                    await expect(card).toHaveAccessibleName(title);
                    const coverBox = await card.getByTestId('recommendation-cover').boundingBox();
                    const titleBox = await card.getByTestId('book-card-title').boundingBox();
                    const lineHeight = await card.getByTestId('book-card-title').evaluate(element => parseFloat(getComputedStyle(element).lineHeight));
                    expect(titleBox!.height).toBeCloseTo(lineHeight * (index === 0 ? 1 : 2), 1);
                    const cardBox = await card.boundingBox();
                    expect(coverBox!.width).toBeCloseTo(cardBox!.width, 1);
                    expect(coverBox!.width / coverBox!.height).toBeCloseTo(11 / 15, 2);
                    expect(titleBox!.y).toBeGreaterThan(coverBox!.y + coverBox!.height);
                    const summary = card.getByTestId('book-card-summary');
                    await expect(summary).toBeVisible();
                    await expect(summary).toHaveCSS('-webkit-line-clamp', '2');
                    const summaryBox = await summary.boundingBox();
                    expect(summaryBox!.height).toBeCloseTo(lineHeight * (index === 1 ? 2 : 1), 1);
                    expect(titleBox!.x - cardBox!.x).toBeCloseTo(12, 1);
                    expect(cardBox!.x + cardBox!.width - titleBox!.x - titleBox!.width).toBeCloseTo(12, 1);
                    expect(summaryBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
                    expect(await summary.evaluate(element => getComputedStyle(element).color))
                        .not.toBe(await card.getByTestId('book-card-title').evaluate(element => getComputedStyle(element).color));
                    expect(cardBox!.height).toBeGreaterThan(coverBox!.height + titleBox!.height);
                    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
                    expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(width);
                    expect(cardBox!.width).toBeGreaterThanOrEqual(width === 320 ? 120 : 160);
                    expect(cardBox!.width).toBeLessThanOrEqual(260);
                }
                const firstBox = await cards.nth(0).boundingBox();
                const secondBox = await cards.nth(1).boundingBox();
                const thirdBox = await cards.nth(2).boundingBox();
                expect(secondBox!.y).toBeCloseTo(firstBox!.y, 1);
                if (width === 320) {
                    expect(thirdBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);
                }
                expect(secondBox!.height - firstBox!.height).toBeCloseTo(42, 1);
                const longTitle = cards.nth(1).getByTestId('book-card-title');
                await expect(longTitle).toHaveCSS('-webkit-line-clamp', '2');
                expect(await longTitle.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
                expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
            });
        }
    }

    for (const width of [320, 1280, 1920]) {
        test(`keeps a single recommendation at normal card width at ${width}px`, async ({ page, request }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto('/');
            const cards = page.getByTestId('recommendation-book-card');
            await expect(cards.first()).toBeVisible();
            const normalBox = await cards.first().boundingBox();
            await request.post(`${mockApiUrl}/_test/reset`, {
                data: { indexData: { ...apiIndex, random_books: apiIndex.random_books.slice(0, 1) } }
            });
            await page.reload();
            await expect(cards).toHaveCount(1);
            await expect(cards.first()).toBeVisible();
            const singleBox = await cards.first().boundingBox();
            expect(singleBox!.width).toBeCloseTo(normalBox!.width, 1);
            expect(singleBox!.x).toBeCloseTo(normalBox!.x, 1);
        });
    }

    test('opens a recommendation by keyboard with a visible focus indicator', async ({ page }) => {
        await page.goto('/');
        const card = page.getByTestId('recommendation-book-card').first();
        await expect(card).toBeVisible();
        await card.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(card).toBeFocused();
        await expect(card).toHaveCSS('outline-style', 'solid');
        await expect(card).toHaveCSS('outline-width', '2px');
        const href = await card.getAttribute('href');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`${href}$`));
    });

    test('keeps recommendation titles readable with doubled text size', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto('/');
        const title = page.getByTestId('book-card-title').first();
        await expect(title).toBeVisible();
        const normalFontSize = await title.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        const resized = await title.evaluate(element => ({
            fontSize: parseFloat(getComputedStyle(element).fontSize),
            height: element.getBoundingClientRect().height,
            lineHeight: parseFloat(getComputedStyle(element).lineHeight),
            width: element.getBoundingClientRect().width,
        }));
        expect(resized.fontSize).toBeCloseTo(normalFontSize * 2, 1);
        expect(resized.height).toBeGreaterThanOrEqual(resized.lineHeight * 2);
        expect(resized.width).toBeGreaterThan(0);
        const card = page.getByTestId('recommendation-book-card').first();
        const href = await card.getAttribute('href');
        await card.click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
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
        await cardWithCover.scrollIntoViewIfNeeded();

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
