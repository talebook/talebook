
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiIndex = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_index.json'), 'utf-8'));

test.describe('Homepage', () => {
    test.beforeEach(async ({ request }) => {
    // Reset mock server to installed state
        const response = await request.post('http://127.0.0.1:8000/_test/reset', {
            data: { installed: true }
        });
        expect(response.ok()).toBeTruthy();
    });

    // No page.route here, relying on real mock server

    test('displays random and recent books', async ({ page }) => {
        await page.goto('/');

        // Check headers
        await expect(page.getByText('随便推荐')).toBeVisible();
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
});
