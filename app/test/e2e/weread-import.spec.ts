import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('WeRead annotation import', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true, loggedIn: true } });
    });

    test('previews JSON, requires an ambiguous match, and keeps no-CFI notes visible', async ({ page }, testInfo) => {
        page.on('pageerror', error => console.error('[pageerror]', error.message));
        page.on('requestfailed', request => console.error('[requestfailed]', request.url(), request.failure()?.errorText));
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/book/1/annotations');
        await expect(page.getByText('这是从微信读书导入的章节级笔记。')).toBeVisible();

        await page.getByRole('button', { name: '导入微信读书' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByText('微信读书官方目前只提供书签数量')).toBeVisible();
        await dialog.getByLabel('官方导出 JSON').setInputFiles({
            name: 'weread.json',
            mimeType: 'application/json',
            buffer: Buffer.from(JSON.stringify({
                book: { bookId: '3300045871', title: '活着', author: '余华' },
                bookmarks: [{ bookmarkId: 'b1', markText: '人是为活着本身而活着的' }],
            })),
        });
        await dialog.getByRole('button', { name: '预览' }).click();
        await expect(dialog.getByText('有 1 本书需要确认')).toBeVisible();

        await dialog.locator('.v-select .v-field').click();
        await page.getByRole('option', { name: /活着 · 余华/ }).click();
        await dialog.getByRole('button', { name: '确认导入' }).click();
        await expect(dialog.getByText(/写入或更新 2 条/)).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('weread-import.png'), fullPage: true });

        await dialog.getByRole('button', { name: '关闭' }).click();
        await expect(page.getByText('人是为活着本身而活着的')).toBeVisible();
        await expect(page.getByText('仅章节定位').last()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
});
