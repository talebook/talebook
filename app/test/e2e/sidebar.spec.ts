
import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Navigation Sidebar', () => {
    test.beforeEach(async ({ request }) => {
    // Ensure installed
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true }
        });
    });

    test('Check all sidebar links', async ({ page }) => {
        await page.goto('/');

        // 1. Home
        await expect(page.locator('nav').getByRole('link', { name: '首页' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');

        // 2. Library（导航已拆分为「本地书库」与「网络书库」）
        await expect(page.locator('nav').getByRole('link', { name: '本地书库' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '本地书库' })).toHaveAttribute('href', '/library');
        await expect(page.locator('nav').getByRole('link', { name: '网络书库' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '网络书库' })).toHaveAttribute('href', '/network');

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

        await expect(page.locator('nav').getByRole('link', { name: '热门' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '热门' })).toHaveAttribute('href', '/hot');

        await expect(page.locator('nav').getByRole('link', { name: '最近' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: '最近' })).toHaveAttribute('href', '/recent');

        const readBooksLink = page.locator('nav').getByRole('link', { name: /已读书目/ });
        await expect(readBooksLink).toBeVisible();
        await expect(readBooksLink).toHaveAttribute('href', '/user/history?tab=finished');
        const readBooksFollowsCategoryHeading = await page.locator('nav').getByText('分类浏览', { exact: true }).evaluate((heading) => {
            const link = document.querySelector('nav a[href="/user/history?tab=finished"]');
            return !!link && Boolean(heading.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING);
        });
        expect(readBooksFollowsCategoryHeading).toBe(true);

        // 5. System Links (if sidebar_sys is true)
        await expect(page.locator('nav').getByRole('link', { name: 'OPDS 介绍' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: 'OPDS 介绍' })).toHaveAttribute('href', '/opds-readme');

        await expect(page.locator('nav').getByRole('link', { name: 'WebDAV 介绍' })).toBeVisible();
        await expect(page.locator('nav').getByRole('link', { name: 'WebDAV 介绍' })).toHaveAttribute('href', '/webdav-readme');

    });

    test('Read books link opens the finished tab with its count', async ({ page }) => {
        await page.goto('/user/history');
        await expect(page.getByRole('tab', { name: /在读 \[0\]/ })).toHaveAttribute('aria-selected', 'true');

        const readBooksLink = page.locator('nav').getByRole('link', { name: /已读书目/ });
        await expect(readBooksLink).toContainText('1');
        await readBooksLink.click();

        await expect(page).toHaveURL('/user/history?tab=finished');
        await expect(page.getByRole('tab', { name: /已读完 \[1\]/ })).toHaveAttribute('aria-selected', 'true');
    });

    test('Network library entry can be hidden without blocking the route', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: false }
        });

        await page.goto('/');
        await expect(page.locator('nav').getByRole('link', { name: '网络书库' })).toHaveCount(0);

        await page.goto('/network');
        await expect(page.getByRole('heading', { name: '网络书库' })).toBeVisible();
    });

    test('Sidebar stays visible at md width', async ({ page }) => {
        // md 断点（960~1279）下侧栏也应常驻展示，而非被折叠成抽屉
        await page.setViewportSize({ width: 1100, height: 800 });
        await page.goto('/');

        const homeLink = page.locator('nav').getByRole('link', { name: '首页' });
        await homeLink.waitFor({ state: 'visible' });

        // 抽屉常驻时 nav 位于左侧可视区域（x >= 0）；若被折叠为 temporary 抽屉则会被移出屏幕（x < 0）
        const box = await homeLink.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
    });

    test('Can navigate via all sidebar links', async ({ page }) => {
    // Define all links to test
        const linksToTest = [
            { name: '本地书库', url: '/library', expectedText: '本地书库' },
            { name: '网络书库', url: '/network', expectedText: '网络书库' },
            { name: '分类导览', url: '/nav', expectedText: '分类导览' },
            { name: '出版社', url: '/publisher', expectedText: '出版社' },
            { name: '作者', url: '/author', expectedText: '作者' },
            { name: '标签', url: '/tag', expectedText: '标签' },
            { name: '文件格式', url: '/format', expectedText: '文件格式' },
            { name: '丛书', url: '/series', expectedText: '丛书' },
            { name: '评分', url: '/rating', expectedText: '评分' },
            { name: '热门', url: '/hot', expectedText: '热门' },
            { name: '最近', url: '/recent', expectedText: '最近' },
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
