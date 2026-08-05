
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mockDir = path.join(__dirname, 'mocks');
const apiRecent = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_recent.json'), 'utf-8'));
const apiHot = JSON.parse(fs.readFileSync(path.join(mockDir, 'api_hot.json'), 'utf-8'));
const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Library Pages', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: true }
        });
    });

    test('Recent page displays books', async ({ page }) => {
        await page.goto('/recent');
    
        await expect(page.getByText(apiRecent.title)).toBeVisible();
    
        if (apiRecent.books.length > 0) {
            await expect(page.getByText(apiRecent.books[0].title).first()).toBeVisible();
        }
    });

    test('Hot page displays books', async ({ page }) => {
        await page.goto('/hot');
    
        await expect(page.getByRole('heading', { name: apiHot.title })).toBeVisible();
    
        if (apiHot.books.length > 0) {
            await expect(page.getByText(apiHot.books[0].title).first()).toBeVisible();
        }
    });

    test('Library opens a paginated picker for high-cardinality chip filters', async ({ page }) => {
        await page.setViewportSize({ width: 960, height: 800 });
        await page.goto('/library');

        const publisherFilter = page.getByTestId('library-filter-publisher');
        await expect(publisherFilter).toBeVisible();
        await expect(page.getByTestId('library-filter-author')).toBeVisible();
        await expect(page.getByTestId('library-filter-tag')).toBeVisible();
        await expect(page.locator('.library-filter-panel .v-slide-group')).toHaveCount(0);
        await expect(page.locator('.filter-label', { hasText: '连载状态' })).toBeVisible();
        await expect(publisherFilter.locator('.library-filter-option')).toHaveCount(10);
        await expect(publisherFilter.getByText('测试出版社10', { exact: true })).toBeVisible();
        await expect(publisherFilter.getByText('测试出版社11', { exact: true })).toHaveCount(0);
        await expect(publisherFilter.getByText('显示更多（110）', { exact: true })).toBeVisible();
        await expect(publisherFilter.locator('.library-filter-chip').first()).toHaveCSS('font-size', '12px');
        expect((await publisherFilter.locator('.library-filter-chip').first().boundingBox())?.height).toBeLessThanOrEqual(30);
        await expect(page.locator('.quick-filter-chip').first()).toHaveCSS('font-size', '12px');
        expect((await page.locator('.quick-filter-chip').first().boundingBox())?.height).toBeLessThanOrEqual(30);

        await publisherFilter.getByTestId('library-filter-publisher-more').click();
        const picker = page.getByTestId('library-filter-publisher-picker');
        await expect(picker).toBeVisible();
        await expect(picker.getByText('共 120 项 · 第 1 / 2 页', { exact: true })).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(100);
        await expect(picker.locator('.library-filter-picker__option').first()).toHaveCSS('font-size', '12px');
        expect((await picker.locator('.library-filter-picker__option').first().boundingBox())?.height).toBeLessThanOrEqual(30);
        await expect(picker.getByText('测试出版社100', { exact: true })).toBeVisible();
        await expect(picker.getByText('测试出版社101', { exact: true })).toHaveCount(0);

        const search = picker.getByTestId('library-filter-publisher-search').locator('input');
        await search.fill('测试出版社11');
        await expect(picker.getByText('找到 11 / 120 项 · 第 1 / 1 页', { exact: true })).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(11);
        await expect(picker.getByText('测试出版社119', { exact: true })).toBeVisible();

        await search.fill('不存在的出版社');
        await expect(picker.getByTestId('library-filter-publisher-empty')).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(0);
        await picker.getByTestId('library-filter-publisher-clear-search').click();
        await expect(picker.getByText('共 120 项 · 第 1 / 2 页', { exact: true })).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(100);

        const pagination = page.getByTestId('library-filter-publisher-pagination');
        await pagination.locator('.v-pagination__item').filter({ hasText: /^2$/ }).click();
        await expect(picker.getByText('共 120 项 · 第 2 / 2 页', { exact: true })).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(20);

        const filteredRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname === '/api/library' && url.searchParams.get('publisher') === '测试出版社117';
        });
        const option = picker.locator('.library-filter-picker__option').filter({ hasText: /^测试出版社117$/ });
        await option.click();
        await filteredRequest;
        await expect(picker).toBeHidden();
        const selected = publisherFilter.locator('.library-filter-option').filter({ hasText: /^测试出版社117$/ });
        await expect(selected).toHaveAttribute('aria-pressed', 'true');

        const unfilteredRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname === '/api/library' && !url.searchParams.has('publisher');
        });
        const allPublishers = publisherFilter.locator('.library-filter-chip').first();
        await allPublishers.click();
        await unfilteredRequest;
        await expect(allPublishers).toHaveAttribute('aria-pressed', 'true');
    });

    test('Library chip filters remain keyboard-usable and responsive on a small phone', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 760 });
        await page.goto('/library');

        const tagFilter = page.getByTestId('library-filter-tag');
        const showMore = tagFilter.getByTestId('library-filter-tag-more');
        await showMore.focus();
        await showMore.press('Enter');
        const picker = page.getByTestId('library-filter-tag-picker');
        await expect(picker).toBeVisible();
        const search = picker.getByTestId('library-filter-tag-search').locator('input');
        await search.fill('标签57');
        await expect(picker.getByText('测试标签57', { exact: true })).toBeVisible();
        await expect(picker.locator('.library-filter-picker__option')).toHaveCount(1);

        const filteredRequest = page.waitForRequest((request) => {
            const url = new URL(request.url());
            return url.pathname === '/api/library' && url.searchParams.get('tag') === '测试标签57';
        });
        const tagOption = picker.locator('.library-filter-picker__option').filter({ hasText: /^测试标签57$/ });
        await tagOption.focus();
        await tagOption.press('Enter');
        await filteredRequest;
        await expect(picker).toBeHidden();
        await expect(tagFilter.locator('.library-filter-option').filter({ hasText: /^测试标签57$/ })).toHaveAttribute('aria-pressed', 'true');

        await showMore.press('Enter');
        await expect(picker).toBeVisible();
        await expect(search).toHaveValue('');
        await page.waitForTimeout(250);
        await page.keyboard.press('Escape');
        await expect(picker).toBeHidden();

        const hasHorizontalOverflow = await page.evaluate(() => (
            document.documentElement.scrollWidth > document.documentElement.clientWidth
        ));
        expect(hasHorizontalOverflow).toBe(false);
    });

    test('Library hides the serialization filter when the network library is disabled', async ({ page, request }) => {
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, showNetworkLibrary: false }
        });

        await page.goto('/library');
        await expect(page.locator('.filter-label', { hasText: '连载状态' })).toHaveCount(0);
        await expect(page.getByTestId('library-filter-publisher')).toBeVisible();
    });
});
