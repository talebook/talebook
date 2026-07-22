import { expect, test } from '@playwright/test';

test.describe('Audiobook production and playback', () => {
    test.beforeEach(async ({ request, page }) => {
        page.on('response', (response) => {
            if (response.status() >= 400) console.info(`[browser-response] ${response.status()} ${response.url()}`);
        });
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        const response = await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true },
        });
        expect(response.ok()).toBeTruthy();
    });

    test('marks audiobook navigation and pages as Beta', async ({ page }) => {
        await page.goto('/audios');
        const audiobookNav = page.locator('nav a[href="/audios"]');
        await expect(audiobookNav.locator('.v-list-item-title')).toHaveText('有声书');
        await expect(audiobookNav.getByTestId('audiobook-nav-beta')).toHaveText('Beta');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');

        await page.goto('/book/1/audios');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');

        await page.goto('/audio-jobs');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');
    });

    test('generates, publishes, plays, and restores a chapter', async ({ page }) => {
        await page.goto('/book/1');
        await page.getByTestId('open-audiobook').click();
        await expect(page).toHaveURL('/book/1/audios');
        await expect(page.getByText('这本书还没有可收听版本')).toBeVisible();

        await page.getByTestId('generate-audiobook').click();
        await expect(page.getByText('创建新的有声版本')).toBeVisible();
        await page.getByTestId('submit-generation').click();
        await expect(page).toHaveURL('/audio-job/1');
        await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 10_000 });

        await page.getByRole('link', { name: '查看有声书' }).click();
        await expect(page.getByText('第一章 雾中的来客')).toBeVisible();
        await page.getByTestId('play-audiobook').click();
        await expect(page.getByTestId('audiobook-player')).toBeVisible();
        await expect(page.getByTestId('audiobook-player')).toContainText('第一章 雾中的来客');
        await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('talebook:audiobook-player:v1')))).toBe(true);

        await page.reload();
        await expect(page.getByTestId('audiobook-player')).toBeVisible();
        await expect(page.getByTestId('audiobook-player')).toContainText('第一章 雾中的来客');
    });

    test('reviews characters and chapter text in advanced mode', async ({ page }) => {
        await page.goto('/book/1/audios');
        await page.getByTestId('generate-audiobook').click();
        await page.getByRole('button', { name: '高级模式' }).click();
        await expect(page.getByTestId('advanced-mode-panel')).toContainText('先识别，再进入配音工作台');
        await expect(page.getByTestId('advanced-mode-panel')).toContainText('调整角色音色与语速');
        await expect(page.getByTestId('submit-generation')).toHaveText('开始识别角色与对白');
        await page.getByTestId('submit-generation').click();

        await expect(page.getByText('等待脚本确认')).toBeVisible({ timeout: 10_000 });
        // The concrete job route parameter opens the review workspace as
        // soon as inspection finishes; no second click should be necessary.
        await expect(page.getByText('角色配音表')).toBeVisible();
        await expect(page.getByText('旁白', { exact: true }).first()).toBeVisible();

        await page.getByRole('tab', { name: '单章对白' }).click();
        const editor = page.locator('.script-editor textarea');
        await editor.fill('[旁白] 海雾散开了。\n[林夏] 我们出发吧。');
        await page.getByTestId('save-chapter').click();
        await page.getByTestId('confirm-workspace').click();
        await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 10_000 });
    });
});
