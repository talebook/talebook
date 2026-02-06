
import { test, expect } from '@playwright/test';

test.describe('Install Flow', () => {
    test.beforeEach(async ({ request }) => {
    // Reset mock server to not installed state
        const response = await request.post('http://127.0.0.1:8000/_test/reset', {
            data: { installed: false }
        });
        expect(response.ok()).toBeTruthy();
    });

    test('Redirects to install page when not installed', async ({ page }) => {
    // Log network requests
        page.on('response', response => {
            if (response.url().includes('/_nuxt/')) return;
            console.log(`<< ${response.status()} ${response.url()}`);
            if (response.status() >= 300 && response.status() < 400) {
                console.log(`   -> Redirect to ${response.headers()['location']}`);
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
