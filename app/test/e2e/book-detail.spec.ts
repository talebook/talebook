
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
    
        // Check reading button（“阅读”按钮，exact 避免匹配“在线阅读”菜单项）
        await expect(page.getByText('阅读', { exact: true })).toBeVisible();
    
        // Check download button (dialog trigger)
        await expect(page.getByText('下载').first()).toBeVisible();
    });
});

test.describe('Convert to PDF menu item', () => {
    // mock 中 book 1 仅有 epub 格式：hasEBooks=true、hasPDF=false，
    // “转为PDF格式”是否可用只取决于 sys.pdf_convert
    const openProcessMenu = async (page) => {
        await page.goto(`/book/${bookId}`);
        const btn = page.getByRole('button', { name: '文件处理' });
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        return page.locator('.v-list-item', { hasText: '转为PDF格式' });
    };

    test('enabled by default (full image)', async ({ page, request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true }
        });
        const item = await openProcessMenu(page);
        await expect(item).toBeVisible();
        await expect(item).not.toHaveClass(/v-list-item--disabled/);
    });

    test('disabled when sys.pdf_convert is false (slim image)', async ({ page, request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true, pdf_convert: false }
        });
        const item = await openProcessMenu(page);
        await expect(item).toBeVisible();
        await expect(item).toHaveClass(/v-list-item--disabled/);
    });
});
