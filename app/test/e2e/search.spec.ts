
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const books = JSON.parse(fs.readFileSync(path.join(mockDir, 'books.json'), 'utf-8'));

// Search keyword
const searchKeyword = "Test";
// Note: real search relies on mock server filtering 'books.json' by name.
// If "Test" is not in books.json, it will return empty.
// books.json has "百年孤独" etc. Let's search for "百年".
const realKeyword = "百年";

test.describe('Search Page', () => {
  test('Search displays results', async ({ page }) => {
    // Go to search page directly with query
    await page.goto(`/search?name=${realKeyword}`);
    
    await expect(page.getByText(`搜索：${realKeyword}`)).toBeVisible();
    
    // "百年" should match "百年孤独" which is first book
    await expect(page.getByText(books[0].title).first()).toBeVisible();
  });
});
