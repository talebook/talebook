import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Legado Source Workbench', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('exports Legado JSON and lists all sample sources', async ({ page }) => {
        const listPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/booksource/list'));
        await page.goto('/plugins/legado');
        await listPromise;
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.route('**/api/admin/booksource/export', async (route) => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await route.continue();
        });
        const exportButton = page.getByRole('button', { name: '导出' });
        const downloadPromise = page.waitForEvent('download');
        await exportButton.click();
        await expect(exportButton).toBeDisabled();
        await expect(exportButton.locator('.v-progress-circular')).toBeVisible();
        await expect(exportButton).toContainText('导出');
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/^talebook-legado-sources-\d{4}-\d{2}-\d{2}\.json$/);
        const stream = await download.createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream) chunks.push(Buffer.from(chunk));
        const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        expect(exported).toEqual(expect.arrayContaining([
            expect.objectContaining({ bookSourceName: '测试书源', bookSourceUrl: 'http://x.com' }),
        ]));

        await page.getByRole('button', { name: '导入书源' }).click();
        await page.getByRole('tab', { name: '导入示例书源' }).click();
        await page.locator('.v-dialog .v-select').click();
        await expect(page.getByRole('option', { name: '内置示例书源' })).toBeVisible();
        await expect(page.getByRole('option', { name: /tickmao \/ Novel 完整书源/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /shidahuilang \/ shuyuan-bak 优选书源/ })).toBeVisible();
        await expect(page.getByText('https://cdn.jsdmirror.com/gh/tickmao/Novel@master/sources/legado/full.json')).toBeVisible();
        await expect(page.getByText('https://raw.githubusercontent.com/shidahuilang/shuyuan-bak/refs/heads/main/good.json')).toBeVisible();
    });

    test('admin entry and sample picker remain reachable at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/library/network');
        const manageSources = page.getByRole('link', { name: '管理书源' });
        await expect(manageSources).toBeVisible();
        await manageSources.click();
        await expect(page).toHaveURL('/plugins/legado');
        await expect(page.getByRole('button', { name: '导出' })).toBeVisible();

        await page.getByRole('button', { name: '导入书源' }).click();
        await page.getByRole('tab', { name: '导入示例书源' }).click();
        const samplePicker = page.getByRole('combobox', { name: '选择示例书源' });
        await samplePicker.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('option', { name: /tickmao \/ Novel 完整书源/ })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
