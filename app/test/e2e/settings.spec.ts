import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Admin Settings (GitHub-style layout)', () => {
    test.beforeEach(async ({ request }) => {
        // 保证已安装并以管理员身份登录（mock 默认）
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('路径页签与保存栏在滚动时保持可见', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        const bar = page.locator('.settings-titlebar');
        await expect(page.getByRole('heading', { name: '系统设置', exact: true })).toBeVisible();
        await expect(page.getByRole('tab', { name: '实例设置' })).toHaveAttribute('aria-selected', 'true');
        await expect(bar.getByRole('button', { name: '保存配置' })).toBeVisible();

        // 路径页签贴在应用顶栏下方，保存栏继续贴在页签下方。
        await page.evaluate(() => window.scrollTo({ top: 1200 }));
        await expect.poll(async () => {
            return await bar.evaluate(el => Math.round(el.getBoundingClientRect().top));
        }, { timeout: 3000 }).toBeLessThanOrEqual(104);
    });

    test('左侧分组导航与全部分类渲染', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        // 分组小标题
        for (const g of ['站点', '访问与用户', '服务与集成', '系统']) {
            await expect(page.locator('.settings-nav-group', { hasText: g })).toBeVisible();
        }

        // 元数据来源和全局设备已迁入插件中心，系统设置保留 14 个分类。
        await expect(page.locator('.settings-section')).toHaveCount(14);
        await expect(page.locator('.settings-nav-item', { hasText: '互联网书籍信息源' })).toHaveCount(0);
        await expect(page.locator('.settings-nav-item', { hasText: '全局设备管理' })).toHaveCount(0);

        // 首个导航项默认高亮
        await expect(page.locator('.settings-nav-item.active')).toHaveText('基础信息');
    });

    test('有声书版本设置展示默认备份保留数', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('.settings-nav-item', { hasText: '有声书版本设置' }).click();
        await expect(page.getByLabel('每本有声书保留的历史版本数')).toHaveValue('3');
    });

    test('旧网络书库展示开关不再隐藏聚合入口', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await expect(page.getByRole('checkbox', { name: '显示网络书库入口与连载状态筛选' })).toHaveCount(0);

        await page.goto('/');
        await expect(page.locator('nav').getByRole('link', { name: '书库浏览' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '网络书库' })).toHaveCount(0);
    });

    test('点击导航项跳转到对应分类并高亮', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.locator('.loading-page')).toBeHidden();

        await page.locator('.settings-nav-item', { hasText: '邮件服务' }).click();

        // 对应 section 滚动到视口顶部附近
        await expect.poll(async () => {
            return await page.locator('#sec-emailService').evaluate(el => Math.round(el.getBoundingClientRect().top));
        }, { timeout: 4000 }).toBeLessThan(180);

        await expect(page.locator('.settings-nav-item.active')).toHaveText('邮件服务');
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
