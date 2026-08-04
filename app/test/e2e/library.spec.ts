
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiRecent = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_recent.json'), 'utf-8'));
const apiHot = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_hot.json'), 'utf-8'));
const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Library Pages', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: true }
        });
    });

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

    test('Library shows the serialization filter and keeps labels on one line', async ({ page }) => {
        await page.setViewportSize({ width: 960, height: 800 });
        await page.goto('/library');

        const statusLabel = page.locator('.filter-label', { hasText: '连载状态' });
        const publisherLabel = page.locator('.filter-label', { hasText: '出版社' });
        await expect(statusLabel).toBeVisible();
        await expect(publisherLabel).toBeVisible();
        await expect(page.getByText('更多(2)', { exact: true })).toBeVisible();
        await expect(publisherLabel).toHaveCSS('white-space', 'nowrap');
        expect((await publisherLabel.boundingBox())?.height).toBeLessThan(32);
    });

    test('Library hides the serialization filter when the network library is disabled', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: false }
        });

        await page.goto('/library');
        await expect(page.locator('.filter-label', { hasText: '连载状态' })).toHaveCount(0);
        await expect(page.locator('.filter-label', { hasText: '出版社' })).toBeVisible();
    });
});
