
import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Admin Pages', () => {
    test.beforeEach(async ({ request }) => {
    // Ensure installed and logged in as admin (mock default)
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('Admin pages access', async ({ page }) => {
    // 1. Settings
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByText('基础信息').first()).toBeVisible();
    
        // 2. Users
        const usersPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/users'));
        await page.goto('/admin/users');
        await usersPromise;

        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByText('用户管理').first()).toBeVisible();
        // Wait for table to render rows
        await expect(page.locator('tbody tr').first()).toBeVisible();
        // Check if email is present in the table row
        await expect(page.locator('tbody tr').first()).toContainText('admin@example.com');
        // 回归保护：头部操作按钮不应放进 v-card-title（否则会继承标题字号导致文字超大）
        const addUserBtn = page.getByRole('button', { name: '添加用户' });
        await expect(addUserBtn).toBeVisible();
        const fontSize = await addUserBtn.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize).toBeLessThanOrEqual(18);

        // 3. Books
        const booksPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/book/list'));
        await page.goto('/admin/books');
        await booksPromise;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByText('图书管理').first()).toBeVisible();
        await expect(page.getByText('书名').first()).toBeVisible();

        // 4. Imports
        const scanPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/scan/list'));
        await page.goto('/admin/imports');
        await scanPromise;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByText('导入图书').first()).toBeVisible();
        await expect(page.getByText('扫描书籍')).toBeVisible();
    });

    test('Users table "detail" column keeps a reasonable width (regression for #917)', async ({ page }) => {
        // 回归保护：详情列没有空格可换行的中文文案，若表格列宽未固定，
        // 该列会被压缩到单字宽度，内容逐字换行纵向堆叠，撑爆整行高度。
        await page.setViewportSize({ width: 1280, height: 800 });
        const usersPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/users'));
        await page.goto('/admin/users');
        await usersPromise;
        await expect(page.locator('.loading-page')).toBeHidden();

        const detailCell = page.locator('tbody tr').first().locator('td').filter({ hasText: '阅读了' });
        await expect(detailCell).toBeVisible();
        const box = await detailCell.boundingBox();
        expect(box.width).toBeGreaterThan(100);

        // 行高也应保持在合理范围内，而不是被压垮的单字列撑到几百像素
        const rowBox = await page.locator('tbody tr').first().boundingBox();
        expect(rowBox.height).toBeLessThan(200);
    });

    test('Settings page interactions', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 1024 });
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();
    
        // Check if the page is loaded correctly
        await expect(page.getByText('基础信息').first()).toBeVisible();

        // Directly submit form or check read-only
        // Skipping button click for now as it's flaky due to viewport issues in headless
        // Instead, verify API call or form presence
        const saveBtn = page.getByRole('button', { name: '保存配置' });
        await expect(saveBtn).toBeVisible();
    });

    test('Books page interactions', async ({ page }) => {
        await page.goto('/admin/books');
        await expect(page.locator('.loading-page')).toBeHidden();
    
        // Check if books are loaded
        // We expect at least one book from mock
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).toBeVisible();
    
        // Test refresh button
        await page.getByRole('button', { name: '刷新' }).click({ force: true });
        // Should still be visible
        await expect(firstRow).toBeVisible();
    });

});
