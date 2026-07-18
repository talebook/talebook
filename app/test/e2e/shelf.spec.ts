import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const books = JSON.parse(fs.readFileSync(path.join(mockDir, 'books.json'), 'utf-8'));
const book = books[0];
const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Shelf', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('shows empty shelf and listed books', async ({ page, request }) => {
        await page.goto('/user/shelf');
        await expect(page.getByText('书架上还没有书，快去加入吧！')).toBeVisible();

        await request.post(`${mockApi}/api/book/${book.id}/shelf`, {
            data: { shelf: true }
        });

        await page.goto('/user/shelf');
        await expect(page.getByText(book.title).first()).toBeVisible();
        await expect(page.locator(`a[href="/book/${book.id}"]`).first()).toBeVisible();
    });

    test('toggles shelf state from book detail', async ({ page, request }) => {
        await page.goto(`/book/${book.id}`);

        const addButton = page.getByRole('button', { name: '加入书架' }).last();
        await expect(addButton).toBeVisible();
        const shelfResponse = page.waitForResponse(resp => resp.url().includes(`/api/book/${book.id}/shelf`) && resp.request().method() === 'POST');
        await addButton.evaluate((el: HTMLElement) => el.click());
        await shelfResponse;

        await expect(page.getByRole('button', { name: '移除书架' }).first()).toBeVisible();
        const rsp = await request.get(`${mockApi}/api/shelf`);
        const data = await rsp.json();
        expect(data.books.some((item: { id: number }) => item.id === book.id)).toBe(true);
    });
});
