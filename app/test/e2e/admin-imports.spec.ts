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

        // 实施项 11.6：目录列表与「默认导入目录」是两个字段。
        // 「检测目录」检测的是默认导入目录（scan_upload_path），不是列表项。
        // data-testid 落在 v-text-field 的包装元素上，真正的输入框是它的内层 input。
        // Vuetify 的 v-text-field 需要 blur 才会把值同步回 v-model。
        await page.getByTestId('import-default-dir').locator('input').fill('/data/books/read-only');
        await page.getByTestId('import-default-dir').locator('input').blur();
        await page.getByRole('button', { name: '检测目录' }).click();
        await expect(page.getByText('目录不可写，仍可读取导入；剪切模式将不可用。')).toBeVisible();
        await expect(page.getByText('当前目录不可写，剪切模式不可用。')).toBeVisible();

        await page.getByTestId('import-default-dir').locator('input').fill('/data/books/imports/incoming');
        await page.getByTestId('import-default-dir').locator('input').blur();
        await page.getByRole('button', { name: '检测目录' }).click();
        await expect(page.getByText('目录可用。发现 3 个支持格式文件。')).toBeVisible();
        // 默认导入目录必须同时也在允许目录列表里，否则保存会被拒绝。
        await page.getByTestId('import-root-0').locator('input').fill('/data/books/imports/incoming');
        await page.getByTestId('import-root-0').locator('input').blur();
        await page.getByRole('radio', { name: /仅索引/ }).check();

        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings') && resp.request().method() === 'POST');
        await page.getByRole('button', { name: '保存设置' }).click();
        await saveResponse;

        await expect(page.getByRole('dialog')).toHaveCount(0);
        // 实施项 11.6：摘要里的目录名与标签现在是分开的元素，且列出全部目录。
        await expect(page.getByText('目录：')).toBeVisible();
        await expect(page.getByText('/data/books/imports/incoming')).toBeVisible();
        await expect(page.getByText('模式：仅索引')).toBeVisible();
    });

    test('adds and removes import directories and persists them', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const settingsResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings'));
        await page.goto('/admin/imports');
        await settingsResponse;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByRole('button', { name: '导入设置' })).toBeEnabled();

        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        await expect(page.getByRole('dialog').getByText('导入设置').first()).toBeVisible();

        // 初始只有一个目录项，且删除按钮在只剩一项时禁用
        await expect(page.getByTestId('import-root-0')).toBeVisible();
        await expect(page.getByTestId('import-root-1')).toHaveCount(0);
        await expect(page.getByTestId('import-root-remove-0')).toBeDisabled();

        // 新增第二项后删除按钮可用
        await page.getByTestId('import-root-add').click();
        await expect(page.getByTestId('import-root-1')).toBeVisible();
        await expect(page.getByTestId('import-root-remove-0')).toBeEnabled();

        // 用目录选择器给第二项填值
        await page.getByTestId('import-root-pick-1').click();
        await expect(page.getByRole('dialog').getByText('选择服务器目录')).toBeVisible();
        await page.getByText('incoming', { exact: true }).click();
        await page.getByRole('button', { name: '选择此目录' }).click();
        await expect(page.getByTestId('import-root-1').locator('input')).toHaveValue('/data/books/imports/incoming');

        // 保存时请求体必须带 import_allowed_roots 数组
        const saveResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings') && resp.request().method() === 'POST');
        await page.getByRole('button', { name: '保存设置' }).click();
        const resp = await saveResponse;
        const body = JSON.parse(resp.request().postData() || '{}');
        expect(Array.isArray(body.import_allowed_roots)).toBe(true);
        expect(body.import_allowed_roots.length).toBe(2);
        expect(body.import_allowed_roots).toContain('/data/books/imports/incoming');

        // 重新打开对话框，两个目录仍在
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        await expect(page.getByTestId('import-root-0')).toBeVisible();
        await expect(page.getByTestId('import-root-1').locator('input')).toHaveValue('/data/books/imports/incoming');

        // 删除第二项后只剩一项，删除按钮重新禁用
        await page.getByTestId('import-root-remove-1').click();
        await expect(page.getByTestId('import-root-1')).toHaveCount(0);
        await expect(page.getByTestId('import-root-remove-0')).toBeDisabled();
    });

    test('rejects a directory outside the allowed prefix', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const settingsResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings'));
        await page.goto('/admin/imports');
        await settingsResponse;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByRole('button', { name: '导入设置' })).toBeEnabled();

        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        await page.getByTestId('import-root-0').locator('input').fill('/etc');
        await page.getByTestId('import-root-0').locator('input').blur();

        await page.getByRole('button', { name: '保存设置' }).click();
        await expect(page.getByText('目录必须位于 /data/ 之下。')).toBeVisible();
        // 校验失败时对话框不关闭，也不发出保存请求
        await expect(page.getByRole('dialog').getByText('导入设置').first()).toBeVisible();
    });

    test('server directory picker fills the selected directory', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const settingsResponse = page.waitForResponse(resp => resp.url().includes('/api/admin/import/settings'));
        await page.goto('/admin/imports');
        await settingsResponse;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByRole('button', { name: '导入设置' })).toBeEnabled();

        await page.getByRole('button', { name: '导入设置' }).dispatchEvent('click');
        // 目录列表与默认导入目录各有一个「选择目录」按钮，用 testid 消除歧义。
        await page.getByTestId('import-root-pick-0').click();
        await expect(page.getByRole('dialog').getByText('选择服务器目录')).toBeVisible();

        await page.getByText('incoming', { exact: true }).click();
        await page.getByRole('button', { name: '选择此目录' }).click();

        await expect(page.getByTestId('import-root-0').locator('input')).toHaveValue('/data/books/imports/incoming');
        await expect(page.getByText('目录可用。发现 3 个支持格式文件。')).toBeVisible();
    });
});
