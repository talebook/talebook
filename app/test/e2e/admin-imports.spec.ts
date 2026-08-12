import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Admin Imports settings', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('opens import settings, validates directory, and saves mode', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const settingsResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings'));
        await page.goto('/admin/imports');
        await settingsResponse;
        await expect(page.locator('.loading-page')).toBeHidden();

        await expect(page.getByRole('button', { name: '导入设置' })).toBeVisible();
        await expect(page.getByRole('button', { name: '导入设置' })).toBeEnabled();
        await expect(page.getByText('模式：复制到书库')).toBeVisible();
        await expect(page.getByText('自动监控导入：未开启')).toBeVisible();

        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        await expect(page.getByRole('dialog').getByText('导入设置').first()).toBeVisible();

        await page.getByLabel('服务器导入目录').fill('/mock/read-only');
        await page.getByRole('button', { name: '检测目录' }).click();
        await expect(page.getByText('目录不可写，仍可读取导入；剪切模式将不可用。')).toBeVisible();
        await expect(page.getByText('当前目录不可写，剪切模式不可用。')).toBeVisible();

        await page.getByLabel('服务器导入目录').fill('/mock/scan/dir/incoming');
        await page.getByRole('button', { name: '检测目录' }).click();
        await expect(page.getByText('目录可用。发现 3 个支持格式文件。')).toBeVisible();
        await page.getByRole('radio', { name: /仅索引/ }).check();

        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings') && resp.request().method() === 'POST');
        await page.getByRole('button', { name: '保存设置' }).click();
        await saveResponse;

        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(page.getByText('目录：/mock/scan/dir/incoming')).toBeVisible();
        await expect(page.getByText('模式：仅索引')).toBeVisible();
    });

    test('server directory picker fills the selected directory', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const settingsResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings'));
        await page.goto('/admin/imports');
        await settingsResponse;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByRole('button', { name: '导入设置' })).toBeEnabled();

        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        await page.getByRole('button', { name: '选择目录' }).click();
        await expect(page.getByRole('dialog').getByText('选择服务器目录')).toBeVisible();

        await page.getByText('incoming', { exact: true }).click();
        await page.getByRole('button', { name: '选择此目录' }).click();

        await expect(page.getByLabel('服务器导入目录')).toHaveValue('/mock/scan/dir/incoming');
        await expect(page.getByText('目录可用。发现 3 个支持格式文件。')).toBeVisible();
    });
});
