import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Admin Settings (GitHub-style layout)', () => {
    test.beforeEach(async ({ request }) => {
        // 保证已安装并以管理员身份登录（mock 默认）
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('顶部悬浮标题栏含标题与保存按钮', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        const bar = page.locator('.settings-titlebar');
        await expect(bar.locator('.settings-page-title')).toBeVisible();
        await expect(bar.getByRole('button', { name: '保存配置' })).toBeVisible();

        // 悬浮固定：向下滚动后标题栏仍停在顶部（贴应用顶栏下方）
        await page.evaluate(() => window.scrollTo({ top: 1200 }));
        await expect.poll(async () => {
            return await bar.evaluate(el => Math.round(el.getBoundingClientRect().top));
        }, { timeout: 3000 }).toBeLessThanOrEqual(56);
    });

    test('左侧分组导航与全部分类渲染', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        // 分组小标题
        for (const g of ['站点', '访问与用户', '服务与集成', '系统']) {
            await expect(page.locator('.settings-nav-group', { hasText: g })).toBeVisible();
        }

        // 所有分类都渲染为 section（17 个）
        await expect(page.locator('.settings-section')).toHaveCount(17);

        // 首个导航项默认高亮
        await expect(page.locator('.settings-nav-item.active')).toHaveText('基础信息');
    });

    test('有声书版本设置展示默认备份保留数', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('.settings-nav-item', { hasText: '有声书版本设置' }).click();
        await expect(page.getByLabel('每本有声书保留的历史版本数')).toHaveValue('3');
    });

    test('高级设置可选择 Readest 并保留旧 EPUB 阅读器', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden({ timeout: 10000 });

        await page.locator('.settings-nav-item', { hasText: '高级配置项' }).click();
        await page.getByRole('combobox', { name: 'EPUB 阅读器' }).press('ArrowDown');

        await expect(page.getByRole('option', { name: 'Readest' })).toBeVisible();
        await expect(page.getByRole('option', { name: /Candle Reader/ })).toBeVisible();
        await expect(page.getByRole('option', { name: /Epub Reader/ })).toBeVisible();
    });

    test('基础信息中默认启用并可保存关闭网络书库展示开关', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        const checkbox = page.getByRole('checkbox', { name: '显示网络书库入口与连载状态筛选' });
        await expect(checkbox).toBeVisible();
        await expect(checkbox).toBeChecked();

        await checkbox.uncheck();
        await page.locator('.settings-titlebar').getByRole('button', { name: '保存配置' }).click();
        await expect(checkbox).not.toBeChecked();

        await page.goto('/');
        await expect(page.locator('nav').getByRole('link', { name: '网络书库' })).toHaveCount(0);
    });

    test('点击导航项跳转到对应分类并高亮', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('.settings-nav-item', { hasText: '互联网书籍信息源' }).click();

        // 对应 section 滚动到视口顶部附近
        await expect.poll(async () => {
            return await page.locator('#sec-bookInfoSources').evaluate(el => Math.round(el.getBoundingClientRect().top));
        }, { timeout: 4000 }).toBeLessThan(120);

        await expect(page.locator('.settings-nav-item.active')).toHaveText('互联网书籍信息源');
    });

    test('元数据来源保留百度百科并使用在线书源替代固定站点', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('#sec-bookInfoSources .v-select').click();

        await expect(page.getByRole('option', { name: '百度百科' })).toBeVisible();
        await expect(page.getByRole('option', { name: '在线书源' })).toBeVisible();
        await expect(page.getByRole('option', { name: '笔趣阁' })).toHaveCount(0);
    });

    test('滚动内容时菜单自动选中对应分类（scroll-spy）', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('#sec-emailService').evaluate(el => el.scrollIntoView({ block: 'start' }));

        await expect(page.locator('.settings-nav-item.active')).toHaveText('邮件服务');

        // 滚动到底部时最后一个分类被选中
        await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight }));
        await expect(page.locator('.settings-nav-item.active')).toHaveText('检查更新');
    });
});
