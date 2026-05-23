import { test, expect } from '@playwright/test';

test.describe('Network Library', () => {
    test.beforeEach(async ({ request }) => {
        await request.post('http://127.0.0.1:8080/_test/reset', {
            data: { installed: true },
        });
    });

    test('search shows results from a source', async ({ page }) => {
        await page.goto('/network');
        await expect(page.getByText('网络书库').first()).toBeVisible();

        await page.getByPlaceholder('输入书名或作者，回车搜索').fill('剑来');
        await page.getByRole('button', { name: '搜索' }).first().click();

        await expect(page.getByText('测试书源').first()).toBeVisible();
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
});
