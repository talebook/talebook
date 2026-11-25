import { expect, test, type Page } from '@playwright/test';

const mockApiUrl = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

async function secondaryTextContrast(page: Page) {
    return await page.locator('.ai-capability p').first().evaluate((element) => {
        const channels = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
        const card = element.closest('.ai-capability');
        if (!card) return 0;
        const [red, green, blue, alpha = 1] = channels(getComputedStyle(element).color);
        const [backgroundRed, backgroundGreen, backgroundBlue] = channels(
            getComputedStyle(card).backgroundColor,
        );
        const composite = [red, green, blue].map((channel, index) => {
            const background = [backgroundRed, backgroundGreen, backgroundBlue][index];
            return channel * alpha + background * (1 - alpha);
        });
        const luminance = (color: number[]) => color.reduce((sum, channel, index) => {
            const normalized = channel / 255;
            const linear = normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
            return sum + linear * [0.2126, 0.7152, 0.0722][index];
        }, 0);
        const foreground = luminance(composite);
        const background = luminance([backgroundRed, backgroundGreen, backgroundBlue]);
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
}

test.beforeEach(async ({ request }) => {
    await request.post(`${mockApiUrl}/_test/reset`, {
        data: { installed: true, loggedIn: true },
    });
});

test('shows the registered AI capability and unified task categories', async ({ page }) => {
    await page.goto('/ai-assistant');

    await expect(page.getByRole('heading', { name: '辅助整理，一处看清' })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '总结鸭 TOP5' })).toBeVisible();
    await expect(page.getByText('百年孤独')).toBeVisible();
    await expect(page.getByText('小王子')).toBeVisible();
    await expect(page.getByRole('button', { name: /运行中/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /待确认/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /失败/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /近期完成/ })).toBeVisible();
    expect(await secondaryTextContrast(page)).toBeGreaterThanOrEqual(4.5);
});

test('keeps secondary content readable in dark theme', async ({ page }) => {
    await page.context().addCookies([{ name: 'theme', value: 'dark', url: 'http://127.0.0.1:3000' }]);
    await page.goto('/ai-assistant');

    await expect(page.getByRole('heading', { name: '辅助整理，一处看清' })).toBeVisible();
    await expect(page.locator('.v-theme--dark').first()).toBeVisible();
    expect(await secondaryTextContrast(page)).toBeGreaterThanOrEqual(4.5);
});

test('keeps filters and task actions usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ai-assistant');

    await page.getByRole('button', { name: /运行中/ }).click();
    await expect(page.getByText('百年孤独')).toBeVisible();
    await expect(page.getByText('小王子')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /查看详情/ })).toBeVisible();
    await expect(page.locator('body')).toHaveScreenshot('ai-assistant-mobile.png', { animations: 'disabled' });

    await page.setViewportSize({ width: 320, height: 640 });
    await expect(page.getByRole('link', { name: /查看详情/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
