
import { test, expect } from '@playwright/test';

test.describe('Navigation Sidebar', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure installed
    await request.post('http://127.0.0.1:8000/_test/reset', {
      data: { installed: true }
    });
  });

  test('Check all sidebar links', async ({ page }) => {
    await page.goto('/');

    // 1. Home
    await expect(page.locator('nav').getByRole('link', { name: '首页' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');

    // 2. Library
    await expect(page.locator('nav').getByRole('link', { name: '书库' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '书库' })).toHaveAttribute('href', '/library');

    // 3. Category Links
    const links = [
        { name: '分类导览', href: '/nav' },
        { name: '出版社', href: '/publisher' },
        { name: '作者', href: '/author' },
        { name: '标签', href: '/tag' },
        { name: '文件格式', href: '/format' },
    ];

    for (const link of links) {
        await expect(page.locator('nav').getByRole('link', { name: link.name })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: link.name })).toHaveAttribute('href', link.href);
    }

    // 4. Secondary Links (Series, Rating, Hot, Recent)
    // These might be inside a list item or just links.
    // Based on AppHeader.vue, they are in a chunked list.
    // { icon: "mdi-library-shelves", href: "/series", text: "丛书", count: store.sys.series },
    // { icon: "mdi-star-half", href: "/rating", text: "评分" },
    // { icon: "mdi-trending-up", href: "/hot", text: "热度榜单" },
    // { icon: "mdi-history", href: "/recent", text: "所有书籍" },

    await expect(page.locator('nav').getByRole('link', { name: '丛书' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '丛书' })).toHaveAttribute('href', '/series');

    await expect(page.locator('nav').getByRole('link', { name: '评分' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '评分' })).toHaveAttribute('href', '/rating');

    await expect(page.locator('nav').getByRole('link', { name: '热度榜单' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '热度榜单' })).toHaveAttribute('href', '/hot');

    await expect(page.locator('nav').getByRole('link', { name: '所有书籍' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: '所有书籍' })).toHaveAttribute('href', '/recent');

    // 5. System Links (if sidebar_sys is true)
    // { icon: "mdi-cellphone", text: "OPDS介绍", href: "/opds-readme", count: "OPDS", target: "_blank" },
    await expect(page.locator('nav').getByRole('link', { name: 'OPDS介绍' })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: 'OPDS介绍' })).toHaveAttribute('href', '/opds-readme');

  });

  test('Can navigate via all sidebar links', async ({ page }) => {
    // Define all links to test
    const linksToTest = [
        { name: '书库', url: '/library', expectedText: '书库' },
        { name: '分类导览', url: '/nav', expectedText: '分类导览' },
        { name: '出版社', url: '/publisher', expectedText: '出版社' },
        { name: '作者', url: '/author', expectedText: '作者' },
        { name: '标签', url: '/tag', expectedText: '标签' },
        { name: '文件格式', url: '/format', expectedText: '文件格式' },
        { name: '丛书', url: '/series', expectedText: '丛书' },
        { name: '评分', url: '/rating', expectedText: '评分' },
        { name: '热度榜单', url: '/hot', expectedText: '热度榜单' },
        { name: '所有书籍', url: '/recent', expectedText: '所有书籍' },
        // OPDS is target=_blank, might be harder to test navigation in same tab, skipping for now or test attribute
        // { name: 'OPDS介绍', url: '/opds-readme', expectedText: 'OPDS' }, 
    ];

    for (const link of linksToTest) {
        await page.goto('/');
        console.log(`Testing navigation to ${link.name}...`);
        
        const navLink = page.locator('nav').getByRole('link', { name: link.name });
        await navLink.waitFor({ state: 'visible' });
        await navLink.click();
        
        await expect(page).toHaveURL(link.url);
        // Verify page content to ensure successful load
        // Note: Some pages might share components (like BookList), so title check is good
        // Adjust selector if needed, e.g. h1, h2, or breadcrumb
        await expect(page.getByText(link.expectedText).first()).toBeVisible();
    }
  });
});
