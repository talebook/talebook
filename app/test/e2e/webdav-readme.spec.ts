
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

        await expect(page.getByRole('navigation', { name: '书库浏览' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '使用 App 访问' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByRole('heading', { name: 'Moke' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'OPDS', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'WebDAV', exact: true })).toBeVisible();
        await expect(page.getByText(/\/opds\//)).toBeVisible();
        await expect(page.getByText(/\/books\//)).toBeVisible();

        const opdsGuide = page.locator('#opds-guide');
        await expect(opdsGuide.getByRole('heading', { name: '常见 OPDS 阅读软件' })).toBeVisible();
        await expect(opdsGuide.getByText('KyBook', { exact: true })).toBeVisible();
        await expect(opdsGuide.getByText('在阅读器中添加新的 OPDS 书库')).toBeVisible();
        await expect(opdsGuide.getByText('打开允许任意下载（访客无需注册或登录）')).toBeVisible();

        const webdavGuide = page.locator('#webdav-guide');
        await expect(webdavGuide.getByRole('heading', { name: '常见 WebDAV 客户端' })).toBeVisible();
        await expect(webdavGuide.getByText(/Windows 文件资源管理器/)).toBeVisible();
        await expect(webdavGuide.getByText('打开支持 WebDAV 的文件管理器或阅读器')).toBeVisible();
        await expect(webdavGuide.getByText('请使用本站注册账号登录，不要使用匿名访问。')).toBeVisible();
    });

    test('redirects both legacy introduction routes to app access', async ({ page }) => {
        await page.goto('/opds-readme');
        await expect(page).toHaveURL('/library/apps');
        await page.goto('/webdav-readme');
        await expect(page).toHaveURL('/library/apps');
    });
});
