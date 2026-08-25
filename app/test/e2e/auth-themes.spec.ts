import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

const themeMatrix = [
    { name: 'light-gray', mode: 'light', primary: '85,92,100', onPrimary: '255,255,255' },
    { name: 'light-gray', mode: 'dark', primary: '116,123,132', onPrimary: '255,255,255' },
    { name: 'minimal', mode: 'light', primary: '255,102,0', onPrimary: '0,0,0' },
    { name: 'minimal', mode: 'dark', primary: '211,84,0', onPrimary: '17,17,17' },
    { name: 'graphite', mode: 'light', primary: '63,109,163', onPrimary: '255,255,255' },
    { name: 'graphite', mode: 'dark', primary: '111,157,214', onPrimary: '13,16,19' },
    { name: 'brass', mode: 'light', primary: '169,119,58', onPrimary: '255,255,255' },
    { name: 'brass', mode: 'dark', primary: '201,154,91', onPrimary: '31,26,16' },
    { name: 'warm-red', mode: 'light', primary: '143,58,52', onPrimary: '251,250,246' },
    { name: 'warm-red', mode: 'dark', primary: '181,82,74', onPrimary: '32,29,24' },
] as const;

function builtinTheme(name: string) {
    return {
        id: `builtin-${name}`,
        name,
        version: '1.0.0',
        author: 'Talebook',
        description: `${name} test theme`,
        active: true,
        installed_at: null,
        builtin: true,
        components: {
            AppHeader: `builtin:${name}/AppHeader`,
            AppFooter: `builtin:${name}/AppFooter`,
        },
    };
}

async function mockAccountApi(page: Page, themeName: string) {
    await page.route('**/api/**', async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (!pathname.startsWith('/api/')) {
            await route.continue();
            return;
        }
        if (pathname === '/api/themes/active') {
            await route.fulfill({ json: { err: 'ok', theme: builtinTheme(themeName) } });
            return;
        }
        if (pathname === '/api/user/info') {
            await route.fulfill({
                json: {
                    err: 'ok',
                    sys: {
                        allow: { register: true },
                        books: 0,
                        authors: 0,
                        publishers: 0,
                        tags: 0,
                        formats: 0,
                        friends: [],
                        socials: [],
                    },
                    user: { is_admin: false, is_login: false, nickname: '' },
                },
            });
            return;
        }
        if (pathname === '/api/user/messages') {
            await route.fulfill({ json: { err: 'ok', messages: [], total: 0 } });
            return;
        }
        if (pathname === '/api/captcha/config') {
            await route.fulfill({ json: { err: 'ok', config: { enabled: false, scenes: {} } } });
            return;
        }
        if (pathname === '/api/user/sign_out') {
            await route.fulfill({ json: { err: 'ok', msg: '你已成功退出登录。' } });
            return;
        }
        if (pathname === '/api/read-done') {
            await route.fulfill({ json: { err: 'ok', books: [], total: 0 } });
            return;
        }
        if (pathname === '/api/book-sources/content') {
            await route.fulfill({ json: { err: 'ok', title: '第一章', content: '正文' } });
            return;
        }
        await route.fulfill({ json: { err: 'ok' } });
    });
}

async function expectSemanticPrimary(page: Page, selector: string, primary: string, onPrimary: string) {
    const element = page.locator(selector).first();
    await expect(element).toBeVisible();
    await expect.poll(async () => element.evaluate((node) => {
        const style = window.getComputedStyle(node);
        return {
            background: style.backgroundColor,
            color: style.color,
        };
    })).toEqual({
        background: `rgb(${primary.replaceAll(',', ', ')})`,
        color: `rgb(${onPrimary.replaceAll(',', ', ')})`,
    });
}

for (const theme of themeMatrix) {
    test(`${theme.name}/${theme.mode} owns login and logout semantic colors`, async ({ context, page }) => {
        await mockAccountApi(page, theme.name);
        await context.addCookies([{
            name: 'theme',
            value: theme.mode,
            domain: '127.0.0.1',
            path: '/',
        }]);

        await page.goto('/login');
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.locator('body')).toHaveClass(new RegExp(`tb-current-builtin-theme-${theme.name}`));
        await expectSemanticPrimary(page, '.login-container .v-toolbar.bg-primary', theme.primary, theme.onPrimary);
        await page.reload();
        await expect(page.locator('.loading-page')).toBeHidden();
        await expectSemanticPrimary(page, '.login-container .v-toolbar.bg-primary', theme.primary, theme.onPrimary);

        await page.goto('/logout');
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.locator('body')).toHaveClass(new RegExp(`tb-current-builtin-theme-${theme.name}`));
        await expectSemanticPrimary(page, '.v-main .v-toolbar.bg-primary', theme.primary, theme.onPrimary);
    });
}

test('client navigation keeps the active theme on account pages without a default-blue frame', async ({ context, page }) => {
    await mockAccountApi(page, 'warm-red');
    await context.addCookies([{
        name: 'theme',
        value: 'light',
        domain: '127.0.0.1',
        path: '/',
    }]);

    await page.goto('/signup');
    await expect(page.locator('.loading-page')).toBeHidden();
    await expectSemanticPrimary(page, '.signup-container .v-toolbar.bg-primary', '143,58,52', '251,250,246');
    await expectSemanticPrimary(page, '.signup-container .v-toolbar .v-btn.bg-success', '76,175,80', '255,255,255');
    await page.getByRole('link', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expectSemanticPrimary(page, '.login-container .v-toolbar.bg-primary', '143,58,52', '251,250,246');
});

test('blank and headerless account pages keep the active semantic theme', async ({ context, page }) => {
    await mockAccountApi(page, 'warm-red');
    await context.addCookies([{
        name: 'theme',
        value: 'light',
        domain: '127.0.0.1',
        path: '/',
    }]);

    for (const path of ['/welcome', '/install', '/active/success']) {
        await page.request.post(`${mockApi}/_test/reset`, {
            data: {
                installed: path !== '/install',
                inviteMode: path === '/welcome',
                invited: path !== '/welcome',
            },
        });
        await page.goto(path);
        await expect(page.locator('.loading-page')).toBeHidden();
        await expect(page.locator('body')).toHaveClass(/tb-current-builtin-theme-warm-red/);
        await expectSemanticPrimary(page, '.v-main .v-toolbar.bg-primary', '143,58,52', '251,250,246');
    }
});

test('reader routes clear the site theme runtime', async ({ context, page }) => {
    await mockAccountApi(page, 'warm-red');
    await context.addCookies([{
        name: 'theme',
        value: 'light',
        domain: '127.0.0.1',
        path: '/',
    }]);

    await page.goto('/network/read?source_id=1&book_url=book&chapter_url=chapter');
    await expect(page.locator('.loading-page')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/tb-current-builtin-theme-/);
    await expect(page.locator('style[data-talebook-theme-runtime]')).toHaveCount(0);
});
