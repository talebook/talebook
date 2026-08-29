
import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('App access page', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('combines Moke, OPDS and WebDAV connection details', async ({ page }) => {
        await page.goto('/library/apps');

        await expect(page.getByRole('heading', { name: '书库浏览' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '使用 App 访问' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('heading', { name: 'Moke' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'OPDS' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'WebDAV' })).toBeVisible();
        await expect(page.getByText(/\/opds\//)).toBeVisible();
        await expect(page.getByText(/\/books\//)).toBeVisible();
    });

    test('redirects both legacy introduction routes to app access', async ({ page }) => {
        await page.goto('/opds-readme');
        await expect(page).toHaveURL('/library/apps');
        await page.goto('/webdav-readme');
        await expect(page).toHaveURL('/library/apps');
    });
});
