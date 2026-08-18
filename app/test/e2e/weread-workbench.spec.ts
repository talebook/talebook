import { expect, test } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('WeRead workbench', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true, loggedIn: true } });
    });

    test('covers search, shelf, statistics, notes, community, and discovery on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/plugins/weread');

        await expect(page.getByText('微信读书接口为只读')).toBeVisible({ timeout: 20_000 });
        await page.getByLabel('微信读书 API Key').fill('wrk-browser-only');
        await page.getByRole('button', { name: '保存并测试' }).click();
        await expect(page.getByText(/已保存密钥/)).toBeVisible();

        await page.getByLabel('搜索关键词').fill('活着');
        await page.getByRole('button', { name: '搜索', exact: true }).click();
        await expect(page.getByText('余华 · 评分 92')).toBeVisible();
        await page.getByRole('button', { name: '详情' }).first().click();
        await expect(page.getByText('关于活着本身的故事。')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();

        await page.getByRole('tab', { name: '书架' }).click();
        await page.getByRole('button', { name: '读取书架' }).click();
        await expect(page.getByText('三体广播剧')).toBeVisible();
        await expect(page.getByText('文章收藏', { exact: true })).toBeVisible();

        await page.getByRole('tab', { name: '统计' }).click();
        await page.getByRole('button', { name: '读取统计' }).click();
        await expect(page.getByText('2 小时 1 分钟')).toBeVisible();

        await page.getByRole('tab', { name: '笔记' }).click();
        await page.getByRole('button', { name: '读取笔记本' }).click();
        await expect(page.getByText(/1 本书有笔记，共 3 条/)).toBeVisible();

        await page.getByRole('tab', { name: '社区' }).click();
        await page.getByLabel('微信读书 bookId').fill('3300045871');
        await page.getByRole('button', { name: '读取社区内容' }).click();
        await expect(page.getByText('最初我们来到这个世界')).toBeVisible();
        await page.getByRole('button', { name: '查看想法' }).click();
        await expect(page.getByText('这句话很有力量')).toBeVisible();

        await page.getByRole('tab', { name: '发现' }).click();
        await page.getByRole('button', { name: '为你推荐' }).click();
        await expect(page.getByText('许三观卖血记')).toBeVisible();

        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });
});
