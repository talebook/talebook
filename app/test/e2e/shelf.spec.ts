import { test, expect, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const books = JSON.parse(fs.readFileSync(path.join(mockDir, 'books.json'), 'utf-8'));
const book = books[0];
const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

const navigateWithinApp = async (page: Page, target: string) => {
    await page.evaluate((path) => {
        const currentState = window.history.state || {};
        const nextState = {
            ...currentState,
            back: `${window.location.pathname}${window.location.search}${window.location.hash}`,
            current: path,
            forward: null,
            position: Number(currentState.position || 0) + 1,
            replaced: false,
            scroll: null,
        };
        window.history.pushState(nextState, '', path);
        window.dispatchEvent(new PopStateEvent('popstate', { state: nextState }));
    }, target);
};

test.describe('Shelf', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApiUrl}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('shows empty shelf and listed books', async ({ page, request }) => {
        await page.goto('/user/shelf');
        await expect(page.getByText('书架上还没有书，快去加入吧！')).toBeVisible();

        await request.post(`${mockApiUrl}/api/book/${book.id}/shelf`, {
            data: { shelf: true }
        });

        await page.goto('/user/shelf');
        await expect(page.getByText(book.title).first()).toBeVisible();
        await expect(page.locator(`a[href="/book/${book.id}"]`).first()).toBeVisible();
    });

    test('restores shelf state after reloading book detail', async ({ page, request }) => {
        await page.goto(`/book/${book.id}`);
        await expect(page.getByText(book.title).first()).toBeVisible({ timeout: 15_000 });

        const addButton = page.getByRole('button', { name: '加入书架' }).last();
        await expect(addButton).toBeVisible();
        const shelfResponse = page.waitForResponse(resp => resp.url().includes(`/api/book/${book.id}/shelf`) && resp.request().method() === 'POST');
        await addButton.evaluate((el: HTMLElement) => el.click());
        await shelfResponse;

        await expect(page.getByRole('button', { name: '移除书架' }).first()).toBeVisible();
        const rsp = await request.get(`${mockApiUrl}/api/shelf`);
        const data = await rsp.json();
        expect(data.books.some((item: { id: number }) => item.id === book.id)).toBe(true);

        await page.reload();
        await expect(page.getByRole('button', { name: '移除书架' }).first()).toBeVisible();
    });

    test('restores reading state after reload and keeps books independent', async ({ page }) => {
        await page.goto(`/book/${book.id}`);
        await expect(page.getByText(book.title).first()).toBeVisible({ timeout: 15_000 });

        const setReadingButton = page.getByRole('button', { name: '设为在读' }).last();
        await expect(setReadingButton).toBeVisible();
        const readingResponse = page.waitForResponse(resp => resp.url().includes(`/api/book/${book.id}/readstate`) && resp.request().method() === 'POST');
        await setReadingButton.evaluate((el: HTMLElement) => el.click());
        await readingResponse;

        await expect(page.getByRole('button', { name: '标记读完' })).toBeVisible();
        await expect(page.getByText('在读', { exact: true }).last()).toBeVisible();

        await page.reload();
        await expect(page.getByRole('button', { name: '标记读完' })).toBeVisible();
        await expect(page.getByText('在读', { exact: true }).last()).toBeVisible();
        await expect(page.getByText('已阅读不足一天')).toBeVisible();

        await navigateWithinApp(page, '/book/2');
        await expect(page).toHaveURL(/\/book\/2$/);
        await expect(page.getByText(books[1].title).first()).toBeVisible();
        await expect(page.getByRole('button', { name: '设为在读' })).toBeVisible();
        await expect(page.getByText('在读', { exact: true })).toHaveCount(0);
    });
});
