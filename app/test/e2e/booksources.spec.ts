import { test, expect } from '@playwright/test';

test.describe('Admin Book Sources', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true }
        });
    });

    test('check validity button keeps text visible while checking', async ({ page }) => {
        const listPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/booksource/list'));
        await page.goto('/admin/booksources');
        await listPromise;
        await expect(page.locator('.loading-page')).toBeHidden();

        const checkBtn = page.getByRole('button', { name: '检测书源有效性' });
        await expect(checkBtn).toBeVisible();

        page.on('dialog', dialog => dialog.accept());
        await checkBtn.click();

        // 检测进行中：按钮禁用、显示转圈，文字保持可见
        await expect(checkBtn).toBeDisabled();
        await expect(checkBtn.locator('.v-progress-circular')).toBeVisible();
        await expect(checkBtn).toContainText('检测书源有效性');
        // 回归保护：v-btn 的 :loading 会把 .v-btn__content 透明度置 0 导致文字隐藏
        const opacity = await checkBtn
            .locator('.v-btn__content')
            .evaluate(el => getComputedStyle(el).opacity);
        expect(parseFloat(opacity)).toBe(1);

        // 检测结束（首次轮询后）：按钮恢复可用，转圈消失
        await expect(checkBtn).toBeEnabled({ timeout: 10000 });
        await expect(checkBtn.locator('.v-progress-circular')).toHaveCount(0);
    });
});
