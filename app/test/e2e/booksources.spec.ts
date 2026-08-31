import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Legado Source Workbench', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('check validity button keeps text visible while checking', async ({ page }) => {
        const listPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/booksource/list'));
        await page.goto('/plugins/legado');
        await listPromise;
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.getByRole('heading', { name: 'Legado 书源工作台' })).toBeVisible();
        const checkMessage = page.locator('.check-message');
        await expect(checkMessage).toContainText('远端书源返回了无法识别的响应');
        expect(await checkMessage.evaluate(element => getComputedStyle(element).whiteSpace)).toBe('normal');
        expect(await checkMessage.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);

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
