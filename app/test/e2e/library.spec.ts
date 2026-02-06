
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiRecent = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_recent.json'), 'utf-8'));
const apiHot = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_hot.json'), 'utf-8'));

test.describe('Library Pages', () => {
    test('Recent page displays books', async ({ page }) => {
        await page.goto('/recent');
    
        await expect(page.getByText(apiRecent.title)).toBeVisible();
    
        if (apiRecent.books.length > 0) {
            await expect(page.getByText(apiRecent.books[0].title).first()).toBeVisible();
        }
    });

    test('Hot page displays books', async ({ page }) => {
        await page.goto('/hot');
    
        await expect(page.getByRole('heading', { name: apiHot.title })).toBeVisible();
    
        if (apiHot.books.length > 0) {
            await expect(page.getByText(apiHot.books[0].title).first()).toBeVisible();
        }
    });
});
