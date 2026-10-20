import { test, expect, type Page } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

function loginPrompt(page: Page) {
    return page.locator('.login-prompt .v-overlay__content');
}

async function signIn(page: Page) {
    const prompt = loginPrompt(page);
    await prompt.getByLabel('用户名').fill('admin');
    await prompt.getByLabel('密码').fill('admin');
    await prompt.getByRole('button', { name: '登录', exact: true }).click();
    await expect(prompt).toBeHidden();
}

test.describe('Login prompt', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true, loggedIn: false } });
    });

    test('masks a login-only page in place and loads it after signing in', async ({ page }) => {
        await page.goto('/me/shelf');

        await expect(page).toHaveURL(/\/me\/shelf$/);
        await expect(loginPrompt(page)).toBeVisible();
        await expect(page.locator('.login-prompt .v-overlay__scrim')).toBeVisible();
        await expect(page.getByText('查看收藏到个人书架的书籍。')).toHaveCount(0);

        await signIn(page);

        await expect(page).toHaveURL(/\/me\/shelf$/);
        await expect(page.getByText('查看收藏到个人书架的书籍。')).toBeVisible();
        await expect(page.getByTestId('header-login')).toHaveCount(0);
    });

    test('leaves a login-only page when the prompt is dismissed', async ({ page }) => {
        await page.goto('/me/shelf');
        await expect(loginPrompt(page)).toBeVisible();

        await page.getByTestId('login-prompt-close').click();

        await expect(page).toHaveURL(/\/$/);
        await expect(loginPrompt(page)).toBeHidden();
    });

    test('opens from the header without leaving the current page', async ({ page }) => {
        await page.goto('/library/apps');
        await expect(page.getByText('登录后可查看当前实例的连接地址和服务状态。')).toBeVisible();

        await page.getByTestId('header-login').click();
        await expect(loginPrompt(page)).toBeVisible();
        await expect(page).toHaveURL(/\/library\/apps$/);

        await page.getByTestId('login-prompt-close').click();
        await expect(loginPrompt(page)).toBeHidden();
        await expect(page).toHaveURL(/\/library\/apps$/);

        await page.getByTestId('header-login').click();
        await signIn(page);
        await expect(page).toHaveURL(/\/library\/apps$/);
        await expect(page.getByText('登录后可查看当前实例的连接地址和服务状态。')).toHaveCount(0);
    });

    test('opens when an API call needs login instead of redirecting', async ({ page }) => {
        await page.route('**/api/user/messages', route => route.fulfill({
            json: { err: 'user.need_login', msg: '请先登录' },
        }));

        await page.goto('/library/apps');

        await expect(loginPrompt(page)).toBeVisible();
        await expect(page).toHaveURL(/\/library\/apps$/);
        await expect(page.locator('.v-dialog .v-alert').filter({ hasText: '请先登录' })).toHaveCount(0);

        await page.unroute('**/api/user/messages');
        await signIn(page);
        await expect(page).toHaveURL(/\/library\/apps$/);
    });

    test('treats a login error during page load as a login-only page', async ({ page }) => {
        await page.route('**/api/admin/log?*', route => route.fulfill({
            json: { err: 'user.need_login', msg: '请先登录' },
        }));

        await page.goto('/admin/logs');
        await expect(loginPrompt(page)).toBeVisible();
        await expect(page).toHaveURL(/\/admin\/logs$/);

        await page.getByTestId('login-prompt-close').click();
        await expect(page).toHaveURL(/\/$/);
        await expect(loginPrompt(page)).toBeHidden();
    });

    test('returns focus to the control that opened the prompt', async ({ page }) => {
        await page.goto('/library/apps');
        const trigger = page.getByTestId('header-login');
        await trigger.focus();
        await page.keyboard.press('Enter');
        await expect(loginPrompt(page)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(loginPrompt(page)).toBeHidden();
        await expect(trigger).toBeFocused();
    });

    test('keeps the standalone login page for direct visits', async ({ page }) => {
        await page.goto('/login?next=/me/shelf');
        await expect(loginPrompt(page)).toHaveCount(0);
        await page.getByTestId('header-login').click();
        await expect(loginPrompt(page)).toHaveCount(0);

        const form = page.locator('.login-container');
        await form.getByLabel('用户名').fill('admin');
        await form.getByLabel('密码').fill('admin');
        await form.getByRole('button', { name: '登录', exact: true }).click();

        await expect(page).toHaveURL(/\/me\/shelf$/);
        await expect(page.getByText('查看收藏到个人书架的书籍。')).toBeVisible();
    });
});
