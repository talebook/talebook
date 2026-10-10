import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const indexData = JSON.parse(fs.readFileSync(path.join(directory, 'mocks/api_index.json'), 'utf8'));
const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
const summary = '这是一段很长的书籍简介，用来检查标题下方的文字是否有左右留白，以及简介是否最多显示两行。'.repeat(4);
const books = indexData.random_books.slice(0, 2).map((book, position) => ({
    ...book,
    title: position === 0 ? '长书名与阅读记录：手机和桌面都应最多显示两行完整布局'.repeat(2) : 'AnUnbrokenEnglishTitleAboutBooksAndReadingRecords'.repeat(2),
    comments: `<p>${summary}</p><script>hidden-script-content</script>`,
}));

test.describe('Reading history card text', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: {
                readingBooks: books,
                finishedBooks: books,
                history: { read_history: books, push_history: books, visit_history: books },
            },
        });
    });

    for (const theme of ['light', 'dark']) {
        for (const width of [320, 600, 768, 960, 1280, 1920, 2560]) {
            test(`keeps titles and summaries in two lines at ${width}px in ${theme} theme`, async ({ page }) => {
                await page.setViewportSize({ width, height: 900 });
                await page.context().addCookies([{ name: 'theme', value: theme, url: 'http://127.0.0.1:9000' }]);
                await page.goto('/user/history');
                await expect(page.locator(`.v-application.v-theme--${theme}`)).toBeVisible();

                for (const tab of [/^在读/, /^已读完/, /^阅读记录/]) {
                    await page.locator('button[role="tab"]').filter({ hasText: tab }).click();
                    const cards = page.locator('[data-testid="book-cover-card"]:visible');
                    await expect(cards).toHaveCount(tab.source === '^阅读记录' ? 6 : 2);
                    for (const card of await cards.all()) {
                        const title = card.getByTestId('book-card-title');
                        const description = card.getByTestId('book-card-summary');
                        await expect(description).toHaveText(summary);
                        await expect(card).toHaveAccessibleName(await title.textContent() || '');
                        for (const text of [title, description]) {
                            await expect(text).toHaveCSS('-webkit-line-clamp', '2');
                            const box = await text.boundingBox();
                            const cardBox = await card.boundingBox();
                            expect(cardBox!.width).toBeGreaterThanOrEqual(width === 320 ? 120 : 160);
                            expect(cardBox!.width).toBeLessThanOrEqual(260);
                            expect(cardBox!.x).toBeGreaterThanOrEqual(0);
                            expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(width);
                            expect(box!.x - cardBox!.x).toBeCloseTo(12, 1);
                            expect(cardBox!.x + cardBox!.width - box!.x - box!.width).toBeCloseTo(12, 1);
                            expect(box!.height).toBeCloseTo(await text.evaluate(element => parseFloat(getComputedStyle(element).lineHeight) * 2), 1);
                            expect(await text.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
                        }
                        const titleBox = await title.boundingBox();
                        const descriptionBox = await description.boundingBox();
                        expect(descriptionBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
                        expect(await description.evaluate(element => getComputedStyle(element).color))
                            .not.toBe(await title.evaluate(element => getComputedStyle(element).color));
                        await expect(card.locator('script')).toHaveCount(0);
                    }
                    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
                }
            });
        }
    }

    for (const width of [320, 1280]) {
        for (const theme of ['light', 'dark']) {
            test(`uses only the actual text lines at ${width}px in ${theme} theme`, async ({ page, request }) => {
                const readingBooks = [
                    { ...books[0], title: '三体', comments: '科幻简介。' },
                    { ...books[1], title: '三体', comments: summary },
                    { ...indexData.random_books[2], title: books[0].title, comments: '科幻简介。' },
                ];
                await request.post(`${mockApiUrl}/_test/reset`, { data: { readingBooks } });
                await page.setViewportSize({ width, height: 900 });
                await page.context().addCookies([{ name: 'theme', value: theme, url: 'http://127.0.0.1:9000' }]);
                await page.goto('/user/history');
                const cards = page.locator('[data-testid="book-cover-card"]:visible');
                await expect(cards).toHaveCount(3);
                for (const [position, lines] of [[0, [1, 1]], [1, [1, 2]], [2, [2, 1]]] as const) {
                    const card = cards.nth(position);
                    const title = card.getByTestId('book-card-title');
                    const description = card.getByTestId('book-card-summary');
                    const lineHeight = await title.evaluate(element => parseFloat(getComputedStyle(element).lineHeight));
                    const titleBox = await title.boundingBox();
                    const descriptionBox = await description.boundingBox();
                    expect(titleBox!.height).toBeCloseTo(lineHeight * lines[0], 1);
                    expect(descriptionBox!.height).toBeCloseTo(lineHeight * lines[1], 1);
                    expect(descriptionBox!.y - titleBox!.y - titleBox!.height).toBeCloseTo(4, 1);
                }
                const shortBox = await cards.nth(0).boundingBox();
                const longBox = await cards.nth(1).boundingBox();
                expect(longBox!.height - shortBox!.height).toBeCloseTo(21, 1);
            });
        }
    }

    for (const width of [320, 1280, 1920]) {
        test(`keeps a single history card at the ordinary width at ${width}px`, async ({ page, request }) => {
            await page.setViewportSize({ width, height: 900 });
            await page.goto('/user/history');
            const card = page.locator('[data-testid="book-cover-card"]:visible').first();
            await expect(card).toBeVisible();
            const ordinaryBox = await card.boundingBox();
            await request.post(`${mockApiUrl}/_test/reset`, { data: { readingBooks: [books[0]] } });
            await page.reload();
            await expect(page.locator('[data-testid="book-cover-card"]:visible')).toHaveCount(1);
            const singleBox = await card.boundingBox();
            expect(singleBox!.width).toBeCloseTo(ordinaryBox!.width, 1);
            expect(singleBox!.x).toBeCloseTo(ordinaryBox!.x, 1);
        });
    }

    test('shows a localized placeholder when the introduction is missing', async ({ page, request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { readingBooks: [{ ...books[0], comments: '' }] },
        });
        await page.goto('/user/history');
        await expect(page.getByTestId('book-card-summary').first()).toHaveText('暂无简介');
    });

    test('opens a reading card by keyboard with visible focus', async ({ page }) => {
        await page.goto('/user/history');
        const card = page.locator('[data-testid="book-cover-card"]:visible').first();
        await expect(card).toBeVisible();
        await card.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(card).toBeFocused();
        await expect(card).toHaveCSS('outline-width', '2px');
        const href = await card.getAttribute('href');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`${href}$`));
    });
});
