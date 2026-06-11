import { test, expect } from '@playwright/test';

test.describe('Network Library', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true },
        });
    });

    test('search shows results from a source', async ({ page }) => {
        await page.goto('/network');
        // 等书源加载完成（也确保 Vue 已完成 hydration，否则 fill 会被注水重置）
        await expect(page.getByText('共 1 个书源')).toBeVisible();

        await page.getByPlaceholder('输入书名或作者，回车搜索').fill('剑来');
        await page.getByRole('button', { name: '搜索' }).first().click();

        await expect(page.getByText('测试书源').first()).toBeVisible();
        await expect(page.getByText('剑来的故事')).toBeVisible();
    });

    test('search and browse tabs', async ({ page }) => {
        await page.goto('/network');
        // 默认在「搜索」tab，搜索框可见；等书源加载（hydration 完成）后再交互
        await expect(page.getByRole('tab', { name: '搜索' })).toBeVisible();
        await expect(page.getByPlaceholder('输入书名或作者，回车搜索')).toBeVisible();
        await expect(page.getByText('共 1 个书源')).toBeVisible();
        // 切到「浏览」tab，发现功能的书源选择器可见（取可见的非浮动 label）
        await page.getByRole('tab', { name: '浏览' }).click();
        await expect(page.getByText('选择书源').last()).toBeVisible();
    });

    test('search results are cached and restored after navigating back', async ({ page }) => {
        await page.goto('/network');
        await expect(page.getByText('共 1 个书源')).toBeVisible();
        await page.getByPlaceholder('输入书名或作者，回车搜索').fill('剑来');
        await page.getByRole('button', { name: '搜索' }).first().click();
        await expect(page.getByText('剑来的故事')).toBeVisible();

        // 离开页面再返回，应从本地缓存即时恢复上次的关键词与结果
        await page.goto('/');
        await page.goto('/network');
        await expect(page.getByPlaceholder('输入书名或作者，回车搜索')).toHaveValue('剑来');
        await expect(page.getByText('剑来的故事')).toBeVisible();
    });

    test('book detail shows chapters and read button', async ({ page }) => {
        await page.goto('/network/book?source_id=1&book_url=' + encodeURIComponent('http://x.com/book/1'));

        await expect(page.getByText('测试网络小说')).toBeVisible();
        await expect(page.getByText('第1章 惊蛰')).toBeVisible();
        await expect(page.getByRole('button', { name: '在线阅读' })).toBeVisible();
        await expect(page.getByRole('button', { name: '保存到本地' })).toBeVisible();
    });

    test('reader loads chapter content', async ({ page }) => {
        await page.goto('/network/book?source_id=1&book_url=' + encodeURIComponent('http://x.com/book/1'));
        await page.getByText('第1章 惊蛰').first().click();
        await expect(page.getByText('这是正文第一段。')).toBeVisible();
    });

    test('save to local shows progress then completion', async ({ page }) => {
        await page.goto('/network/book?source_id=1&book_url=' + encodeURIComponent('http://x.com/book/1'));
        await page.getByRole('button', { name: '保存到本地' }).click();
        // 对话框中确认开始保存
        await page.getByRole('button', { name: '开始保存' }).click();
        // 先看到进行中的进度（done/total）
        await expect(page.getByText('已保存 40/100 章')).toBeVisible();
        // 再看到完成态与查看链接
        await expect(page.getByText('已保存到本地书库')).toBeVisible();
        await expect(page.getByRole('link', { name: '查看本地书籍' })).toBeVisible();
    });
});
