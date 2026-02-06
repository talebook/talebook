
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const books = JSON.parse(fs.readFileSync(path.join(mockDir, 'books.json'), 'utf-8'));
const bookId = books[0].id;
const apiBook = JSON.parse(fs.readFileSync(path.join(mockDir, `api_book_${bookId}.json`), 'utf-8'));

test.describe('Book Detail Page', () => {
    // No page.route, relying on real mock server

    test('displays book details', async ({ page }) => {
        await page.goto(`/book/${bookId}`);

        // Check title
        await expect(page.getByText(apiBook.book.title).first()).toBeVisible();

        // Check author
        if (apiBook.book.authors && apiBook.book.authors.length > 0) {
        // Author might be in a chip or text
            await expect(page.getByText(apiBook.book.authors[0]).first()).toBeVisible();
        }

        // Check publisher
        if (apiBook.book.publisher) {
            await expect(page.getByText(apiBook.book.publisher).first()).toBeVisible();
        }
    
        // Check reading button
        await expect(page.getByText('阅读')).toBeVisible();
    
        // Check download button (dialog trigger)
        await expect(page.getByText('下载').first()).toBeVisible();
    });
});
