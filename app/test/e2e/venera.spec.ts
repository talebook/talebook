import { test, expect } from '@playwright/test';

test.setTimeout(60000);

test.beforeEach(async ({ request }) => {
    await request.post(`${process.env.MOCK_API_URL || 'http://127.0.0.1:8080'}/_test/reset`, {
        data: { installed: true, loggedIn: true },
    });
});

test('comic detail exposes keyboard accessible chapters and the existing reader', async ({ page }) => {
    await page.route('**/api/book-sources/book?**', route => route.fulfill({ json: {
        err: 'ok', download_mode: 'none', book: {
            name: '测试漫画', media_type: 'comic', online_readable: true, intro: '漫画简介',
        },
    } }));
    await page.route('**/api/book-sources/toc?**', route => route.fulfill({ json: {
        err: 'ok', chapters: [{ name: 'Volume 1 - EN · 2: First', url: 'test-chapter' }],
    } }));
    await page.route('**/read-online-comic?**', route => route.fulfill({
        contentType: 'text/html; charset=utf-8', body: '<p>现有漫画阅读器宿主</p>',
    }));
    await page.goto('/network/book?source_id=plugin:1&book_url=test-book');
    await expect(page.locator('.v-main')).toBeVisible({ timeout: 20000 });
    const chapter = page.getByRole('link', { name: 'Volume 1 - EN · 2: First' });
    await expect(chapter).toBeVisible();
    await expect(page.getByRole('button', { name: '在线阅读' })).toBeEnabled();
    await expect(page.getByRole('button', { name: '保存到本地' })).toHaveCount(0);
    await chapter.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/read-online-comic\?/);
    await expect(page.getByText('现有漫画阅读器宿主')).toBeVisible();
});

test('empty comic chapters disable reading and explain the state at mobile width', async ({ page }) => {
    await page.route('**/api/book-sources/book?**', route => route.fulfill({ json: {
        err: 'ok', download_mode: 'none', book: { name: '空章节漫画', media_type: 'comic', online_readable: true },
    } }));
    await page.route('**/api/book-sources/toc?**', route => route.fulfill({ json: { err: 'ok', chapters: [] } }));
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto('/network/book?source_id=plugin:1&book_url=empty-book');
    await expect(page.locator('.v-main')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('该书籍暂时没有可读章节')).toBeVisible();
    await expect(page.getByRole('button', { name: '在线阅读' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('detail failure remains visible and retry recovers the chapter list', async ({ page }) => {
    let failed = true;
    await page.route('**/api/book-sources/book?**', route => route.fulfill({ json: failed
        ? { err: 'venera.timeout', msg: '漫画源连接超时，请重试' }
        : { err: 'ok', download_mode: 'none', book: { name: '恢复的漫画', media_type: 'comic', online_readable: true } },
    }));
    await page.route('**/api/book-sources/toc?**', route => route.fulfill({ json: {
        err: 'ok', chapters: [{ name: '第一话', url: 'chapter' }],
    } }));
    await page.goto('/network/book?source_id=plugin:1&book_url=retry-book');
    await expect(page.locator('.v-main')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('漫画源连接超时，请重试')).toBeVisible();
    failed = false;
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await expect(page.getByRole('link', { name: '第一话' })).toBeVisible();
    await expect(page.getByText('漫画源连接超时，请重试')).toHaveCount(0);
});

test('comic metadata is displayed as text in browse cards', async ({ page }) => {
    await page.route('**/api/book-sources', route => route.fulfill({ json: { err: 'ok', items: [{
        id: 'plugin:1', source_key: 'plugin:1', name: 'MangaDex', enabled: true, has_explore: true,
    }] } }));
    await page.route('**/api/book-sources/categories?**', route => route.fulfill({ json: {
        err: 'ok', items: [{ name: '最新漫画', url: 'recent' }],
    } }));
    await page.route('**/api/book-sources/browse?**', route => route.fulfill({ json: {
        err: 'ok', has_more: false, books: [{ name: '安全漫画', book_url: 'book', media_type: 'comic',
            intro: '<img src=x onerror="document.body.dataset.injected=true">', author: '作者',
        }],
    } }));
    await page.goto('/library/network');
    await expect(page.locator('.v-main')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('共 1 个书源')).toBeVisible();
    await page.getByRole('tab', { name: '浏览' }).click();
    await page.getByRole('combobox', { name: '选择书源' }).focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('option', { name: 'MangaDex' }).click();
    await page.getByText('最新漫画', { exact: true }).click();
    await expect(page.getByTestId('book-card').first()).toContainText('<img src=x');
    expect(await page.evaluate(() => document.body.dataset.injected)).toBeUndefined();
    await expect(page.getByRole('button', { name: '下一页', exact: true })).toBeDisabled();
});
