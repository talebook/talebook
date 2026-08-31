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

    test('loads and saves Legado global concurrency and network protection settings', async ({ page }) => {
        await page.goto('/plugins/legado');
        await page.getByRole('button', { name: /全局配置/ }).click();

        const resultLimit = page.getByLabel('每个书源的结果数');
        const searchConcurrency = page.getByLabel('搜索并发数');
        const saveConcurrency = page.getByLabel('保存并发数');
        const protection = page.getByLabel('阻止访问非公网地址');
        await expect(resultLimit).toHaveValue('5');
        await expect(searchConcurrency).toHaveValue('20');
        await expect(saveConcurrency).toHaveValue('10');
        await expect(protection).toBeChecked();

        await resultLimit.fill('0');
        await page.getByRole('button', { name: '保存', exact: true }).click();
        await expect(page.getByText('请输入 1–100 之间的整数。')).toBeVisible();

        await resultLimit.fill('7');
        await searchConcurrency.fill('4');
        await saveConcurrency.fill('3');
        await protection.uncheck();
        await expect(page.getByText(/书源可访问本机和局域网 HTTP 服务/)).toBeVisible();
        await page.getByRole('button', { name: '保存', exact: true }).click();
        await expect(page.getByText('Legado 全局配置已保存')).toBeVisible();

        await page.reload();
        await page.getByRole('button', { name: /全局配置/ }).click();
        await expect(page.getByLabel('每个书源的结果数')).toHaveValue('7');
        await expect(page.getByLabel('搜索并发数')).toHaveValue('4');
        await expect(page.getByLabel('保存并发数')).toHaveValue('3');
        await expect(page.getByLabel('阻止访问非公网地址')).not.toBeChecked();
    });

    test('admin entry and sample picker remain reachable at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/library/network');
        const manageSources = page.getByRole('link', { name: '管理书源' });
        await expect(manageSources).toBeVisible();
        await manageSources.click();
        await expect(page).toHaveURL('/plugins/legado');
        await expect(page.getByRole('button', { name: '导出' })).toBeVisible();
        await page.getByRole('button', { name: /全局配置/ }).click();
        await expect(page.getByLabel('每个书源的结果数')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

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
