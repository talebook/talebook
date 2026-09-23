import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.beforeEach(async ({ request }) => {
    const response = await request.post(`${mockApi}/_test/reset`, { data: { installed: false } });
    expect(response.ok()).toBeTruthy();
});

test('switches to Russian and retains the selection after reload', async ({ page, context }) => {
    await page.goto('/install');
    await expect(page.getByText('安装 TaleBook', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: '语言', exact: true }).press('Enter');
    await page.locator('.v-list-item').filter({ hasText: /^Русский$/ }).press('Enter');
    await expect(page.getByText('Установка TaleBook', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Язык', exact: true })).toBeVisible();
    await expect(page.getByLabel('Имя администратора', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Завершить настройку' })).toBeVisible();
    expect((await context.cookies()).find(cookie => cookie.name === 'i18n_redirected')?.value).toBe('ru-RU');
    await page.reload();
    await expect(page.getByText('Установка TaleBook', { exact: true })).toBeVisible();
    await page.screenshot({ path: test.info().outputPath('russian-install-desktop.png'), fullPage: true });
});

test.describe('Russian browser language', () => {
    test.use({ locale: 'ru-RU', extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' }, viewport: { width: 320, height: 800 } });

    test('detects Russian without a cookie and renders the narrow installation form', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/install/);
        await expect(page.getByText('Установка TaleBook', { exact: true })).toBeVisible();
        await expect(page.getByLabel('Имя администратора', { exact: true })).toBeVisible();
        const submit = page.getByRole('button', { name: 'Завершить настройку' });
        await submit.scrollIntoViewIfNeeded();
        await expect(submit).toBeVisible();
        await page.screenshot({ path: test.info().outputPath('russian-install-mobile.png'), fullPage: true });
        const overflow = await page.evaluate(() => ({
            viewport: window.innerWidth,
            width: document.documentElement.scrollWidth,
            elements: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > window.innerWidth + 1)
                .slice(0, 8).map(element => ({ tag: element.tagName, class: element.className, text: element.textContent?.slice(0, 100) })),
        }));
        expect(overflow.width, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport);
    });
});
