
import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Install Flow', () => {
    test.beforeEach(async ({ request }) => {
    // Reset mock server to not installed state
        const response = await request.post(`${mockApi}/_test/reset`, {
            data: { installed: false }
        });
        expect(response.ok()).toBeTruthy();
    });

    test('Redirects to install page when not installed', async ({ page }) => {
        const installRedirects: number[] = [];
        const undefinedErrors: string[] = [];
        const pageErrors: string[] = [];

        page.on('console', message => {
            const text = message.text();
            if (/TypeError|Cannot read properties of undefined/.test(text)) undefinedErrors.push(text);
        });
        page.on('pageerror', error => pageErrors.push(error.message));

    // Log network requests
        page.on('response', response => {
            if (response.url().includes('/_nuxt/')) return;
            console.log(`<< ${response.status()} ${response.url()}`);
            if (response.status() >= 300 && response.status() < 400) {
                console.log(`   -> Redirect to ${response.headers()['location']}`);
                if ((response.headers()['location'] || '').includes('/install')) {
                    installRedirects.push(response.status());
                }
            }
        });

        console.log('Navigating to / ...');
        // Go to homepage
        await page.goto('/');
    
        console.log('Checking URL...');
        // Should be redirected to /install
        // Increase timeout to allow for hydration and API call
        await expect(page).toHaveURL(/\/install/, { timeout: 10000 });
    
        // Check install form
        await expect(page.getByText('安装 TaleBook')).toBeVisible();
        await page.waitForLoadState('networkidle');

        expect(installRedirects).toEqual([302]);
        expect(undefinedErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });

    test('Install redirect uses 302, not a cacheable 301', async ({ page }) => {
        // Regression: a 301 (Moved Permanently) gets cached by the browser, so once a
        // fresh user hits "/" while not_installed, "/" -> "/install" is pinned permanently
        // and never re-checked — leaving them stuck on the install page even after setup.
        const installRedirectStatuses: number[] = [];
        page.on('response', response => {
            const status = response.status();
            if (status >= 300 && status < 400) {
                const location = response.headers()['location'] || '';
                if (location.includes('/install')) {
                    installRedirectStatuses.push(status);
                }
            }
        });

        await page.goto('/');
        await expect(page).toHaveURL(/\/install/, { timeout: 10000 });

        expect(installRedirectStatuses.length).toBeGreaterThan(0);
        expect(installRedirectStatuses).not.toContain(301);
        for (const status of installRedirectStatuses) {
            expect(status).toBe(302);
        }
    });

    test('Can complete installation', async ({ page }) => {
        page.on('console', msg => console.log('Browser Console:', msg.text()));
        page.on('response', response => {
            if (response.url().includes('/_nuxt/')) return;
            console.log(`<< ${response.status()} ${response.url()}`);
        });

        // Manually go to install page to ensure we are there
        await page.goto('/install');
    
        // Fill form
        await page.getByLabel('网站标题').fill('My TaleBook');
        await page.getByLabel('管理员用户名').fill('admin');
        await page.getByLabel('管理员登录密码').fill('password123');
        await page.getByLabel('管理员Email').fill('admin@example.com');
    
        // Click submit
        await page.getByRole('button', { name: '完成设置' }).click();

        // Check progress messages
        await expect(page.getByText('配置写入成功')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('API服务正常')).toBeVisible({ timeout: 10000 });
    
        // Should verify installation and redirect to home
        await expect(page).toHaveURL('/', { timeout: 15000 });
    
        // Should see homepage content
        // Mock server returns static title "Talebook Mock" regardless of what we submitted
        await expect(page.getByText('Talebook Mock').first()).toBeVisible();
    });
});

test.describe('Private Library Access Gate', () => {
    test.beforeEach(async ({ request }) => {
        const response = await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, inviteMode: true, invited: false }
        });
        expect(response.ok()).toBeTruthy();
    });

    test('redirects to the welcome page without corrupting bootstrap state', async ({ page }) => {
        const undefinedErrors: string[] = [];
        const pageErrors: string[] = [];
        const welcomeRedirects: number[] = [];

        page.on('console', message => {
            const text = message.text();
            if (/TypeError|Cannot read properties of undefined/.test(text)) undefinedErrors.push(text);
        });
        page.on('pageerror', error => pageErrors.push(error.message));
        page.on('response', response => {
            const location = response.headers()['location'] || '';
            if (response.status() >= 300 && response.status() < 400 && location.includes('/welcome')) {
                welcomeRedirects.push(response.status());
            }
        });

        await page.goto('/');
        await expect(page).toHaveURL(/\/welcome(?:\?|$)/, { timeout: 10000 });
        await expect(page.getByText('请输入访问码').first()).toBeVisible();
        await page.waitForLoadState('networkidle');

        expect(welcomeRedirects).toEqual([302]);
        expect(undefinedErrors).toEqual([]);
        expect(pageErrors).toEqual([]);
    });
});
