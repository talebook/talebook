import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Light-gray sidebar', () => {
    test.beforeEach(async ({ context, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, activeTheme: 'light-gray' },
        });
        await context.addCookies([{
            name: 'theme',
            value: 'light',
            domain: '127.0.0.1',
            path: '/',
        }]);
    });

    test('the menu button fully closes and reopens the drawer', async ({ page }, testInfo) => {
        await page.goto('/admin/themes');
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.locator('body')).toHaveClass(/tb-current-builtin-theme-light-gray/);

        const toggle = page.locator('.tb-theme-nav-toggle');
        const drawer = page.locator('.tb-theme-drawer');
        const main = page.locator('.v-main');

        await expect(toggle.locator('.mdi-menu')).toBeVisible();
        await expect(toggle.locator('.tb-theme-avatar-toggle')).toHaveCount(0);
        await expect(drawer).toHaveClass(/v-navigation-drawer--active/);
        await expect(drawer).not.toHaveClass(/v-navigation-drawer--rail/);
        await expect.poll(() => drawer.evaluate(node => getComputedStyle(node).width)).toBe('240px');
        await expect.poll(() => main.evaluate(node => getComputedStyle(node).paddingLeft)).toBe('240px');

        await toggle.click();

        await expect(drawer).not.toHaveClass(/v-navigation-drawer--active/);
        await expect(drawer).not.toHaveClass(/v-navigation-drawer--rail/);
        await expect.poll(() => main.evaluate(node => getComputedStyle(node).paddingLeft)).toBe('0px');
        const screenshotPath = testInfo.outputPath('light-gray-sidebar-closed.png');
        await page.screenshot({ path: screenshotPath });
        await testInfo.attach('light-gray-sidebar-closed', { path: screenshotPath });

        await toggle.click();

        await expect(drawer).toHaveClass(/v-navigation-drawer--active/);
        await expect.poll(() => main.evaluate(node => getComputedStyle(node).paddingLeft)).toBe('240px');
    });
});
