import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

test.skip(!process.env.TALEBOOK_UPGRADE_URL || !process.env.TALEBOOK_UPGRADE_CREDENTIALS, 'Requires a disposable real Docker backend');

test('real backend login, library, reader, upgrade status and responsive layout', async ({ page }, testInfo) => {
    const expectedVersion = process.env.TALEBOOK_UPGRADE_EXPECTED_VERSION || 'v2';
    const credentials = JSON.parse(readFileSync(process.env.TALEBOOK_UPGRADE_CREDENTIALS!, 'utf8'));
    const login = await page.request.post('/api/user/sign_in', { form: credentials });
    expect((await login.json()).err).toBe('ok');
    await page.goto('/');
    await expect(page.locator('body')).not.toContainText('not_installed');
    const books = await page.request.get('/api/index');
    expect((await books.json()).new_books.length).toBeGreaterThan(0);
    await page.goto('/read/1');
    await expect(page.locator('body')).toBeVisible();
    await page.goto('/admin/settings/general');
    const title = page.getByRole('heading', { name: '应用升级', exact: true });
    await expect(title).toBeVisible({ timeout: 20000 });
    await title.scrollIntoViewIfNeeded();
    await expect(page.getByText(`当前应用：${expectedVersion}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('upgrade-desktop.png'), fullPage: false });
    // A stale tab must refresh before a new backend can execute its operation.
    await page.evaluate(() => { document.documentElement.dataset.talebookVersion = 'old-tab'; });
    await page.getByRole('button', { name: '检查版本', exact: true }).click();
    await page.waitForFunction(expected => document.documentElement.dataset.talebookVersion === expected, expectedVersion);
    await expect(title).toBeVisible();
    await page.setViewportSize({ width: 320, height: 780 });
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('upgrade-mobile.png'), fullPage: false });
    const install = page.getByRole('button', { name: '下载并安装', exact: true });
    if (await install.count()) {
        await install.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('upgrade-confirm.png') });
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(install).toBeFocused();
    }
    await page.context().addCookies([{ name: 'theme', value: 'dark', url: process.env.TALEBOOK_UPGRADE_URL! }]);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/);
    await title.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('upgrade-dark.png'), fullPage: false });
});
