// Requires scripts/venera_live_server.py and Nuxt against that real backend.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const access = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[3] || '../document/screenshots/tb-236');
const executablePath = process.env.CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const context = await browser.newContext({ baseURL, locale: 'zh-CN', viewport: { width: 1440, height: 1000 } });
const report = { timestamp: new Date().toISOString(), backend: 'real Talebook + Calibre', mocks: false };
await fs.mkdir(output, { recursive: true });
async function api(url) {
    console.log('Validating', new URL(url, baseURL).pathname);
    const response = await context.request.get(url, { timeout: 90000 });
    const data = await response.json();
    expect(data.err, data.msg).toBe('ok');
    return data;
}
async function shot(page, name) {
    await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
}
try {
    const login = await context.request.post('/api/user/sign_in', { form: { username: access.username, password: access.password } });
    expect((await login.json()).err).toBe('ok');
    await context.storageState({ path: path.join(path.dirname(path.resolve(process.argv[2])), 'browser-auth.json') });
    const source = encodeURIComponent(access.source_id);
    const browse = await api(`/api/book-sources/browse?source_id=${source}&url=recent`);
    report.browse = { books: browse.books.length, hasMore: browse.has_more };
    const search = await api(`/api/book-sources/search?key=Pepper&sources=${source}&mode=manual`);
    let result;
    for (let i = 0; i < 90; i++) {
        result = await api(`/api/book-sources/search/status?task_id=${search.task_id}`);
        if (result.finished) break;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    expect(result.finished).toBe(true);
    report.search = { query: 'Pepper', groups: result.results?.length, books: result.results?.flatMap(g => g.books || []).length };
    expect(report.search.books).toBeGreaterThan(0);
    const bookId = 'df25d42b-806c-4cc5-9aef-ce08daa4b83a';
    const book = await api(`/api/book-sources/book?source_id=${source}&book_url=${bookId}`);
    const toc = await api(`/api/book-sources/toc?source_id=${source}&book_url=${bookId}`);
    const chapter = toc.chapters[0];
    const manifest = await api(`/api/book-sources/comic/pages?source_id=${source}&chapter_url=${encodeURIComponent(chapter.url)}`);
    report.comic = { id: bookId, title: book.book.name, chapter: chapter.name, chapters: toc.chapters.length, pages: manifest.pages.length };
    report.images = [];
    for (const [label, url] of [['cover', book.book.cover_url], ...manifest.pages.slice(0, 2).map((p, i) => [`page${i + 1}`, p.url])]) {
        console.log('Validating image', label);
        const image = await context.request.get(url, { timeout: 60000 });
        expect(image.status()).toBe(200);
        expect(image.headers()['content-type']).toMatch(/^image\//);
        report.images.push({ label, status: image.status(), type: image.headers()['content-type'], bytes: (await image.body()).length });
    }
    const page = await context.newPage();
    await page.goto('/library/network');
    await expect(page.getByRole('link', { name: '配置漫画源' })).toBeVisible({ timeout: 60000 });
    await shot(page, 'entry-desktop');
    await page.getByRole('tab', { name: '浏览', exact: true }).click();
    await page.getByRole('combobox', { name: '选择书源' }).focus();
    await page.keyboard.press('ArrowDown');
    await page.getByRole('option', { name: 'Venera 漫画源', exact: true }).click();
    await page.getByText('最新漫画', { exact: true }).click();
    await expect(page.getByTestId('book-card').first()).toBeVisible({ timeout: 90000 });
    await shot(page, 'browse-desktop');
    await page.getByRole('tab', { name: '搜索', exact: true }).click();
    await page.getByRole('button', { name: '手选', exact: true }).click();
    const pickSource = page.getByRole('combobox', { name: '选择书源（输入名称过滤）' });
    await pickSource.fill('Venera');
    await page.getByRole('option', { name: 'Venera 漫画源', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByPlaceholder('输入书名或作者，回车搜索').fill('Pepper');
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await expect(page.getByText(book.book.name, { exact: true })).toBeVisible({ timeout: 90000 });
    await shot(page, 'search-desktop');
    await page.getByText(book.book.name, { exact: true }).click();
    await expect(page.getByRole('link', { name: chapter.name, exact: true })).toBeVisible({ timeout: 90000 });
    report.browserSource = { browse: true, search: true, detailFromSearch: true };
    await page.goto('/library/network');
    await expect(page.getByRole('link', { name: '配置漫画源' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('link', { name: '配置漫画源' }).click();
    const settings = page.getByRole('dialog').filter({ has: page.locator('#plugin-details-dialog-title') });
    await expect(settings).toBeVisible({ timeout: 30000 });
    await settings.getByRole('button', { name: '全局配置', exact: true }).click();
    await expect(settings.getByText('MangaDex', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(output, 'configuration-desktop.png') });
    await settings.getByRole('button', { name: '保存', exact: true }).click();
    await settings.getByRole('button', { name: '测试连接', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/plugins\/runs\/\d+/);
    const runId = new URL(page.url()).pathname.split('/').at(-1);
    let check;
    for (let i = 0; i < 120; i++) {
        check = await api(`/api/admin/plugins/runs/${runId}`);
        if (!['queued', 'pending', 'running'].includes(check.run.status)) break;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    expect(check.run.status).toBe('succeeded');
    report.configuration = { saved: true, testStatus: check.run.status };
    await page.goto(`/network/book?source_id=${source}&book_url=${bookId}`);
    await expect(page.getByRole('link', { name: chapter.name, exact: true })).toBeVisible({ timeout: 90000 });
    await expect(page.getByRole('button', { name: '保存到本地' })).toHaveCount(0);
    await expect.poll(() => page.locator('.v-main .v-img img').first().evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
    await shot(page, 'detail-desktop');
    const link = page.getByRole('link', { name: chapter.name, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.kr-spread img').first()).toBeVisible({ timeout: 90000 });
    await expect.poll(() => page.locator('.kr-spread img').first().evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
    await shot(page, 'reader-desktop-page1');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.kr-page-count')).toContainText('2', { timeout: 10000 });
    await expect.poll(() => page.locator('.kr-spread img').first().evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
    await shot(page, 'reader-desktop-page2');
    report.reader = { keyboardChapter: true, flipped: true, imageDecoded: true };
    await page.setViewportSize({ width: 320, height: 760 });
    await shot(page, 'reader-mobile');
    await page.getByRole('button', { name: 'Exit reader' }).click();
    await expect(page.getByRole('link', { name: chapter.name, exact: true })).toBeVisible({ timeout: 90000 });
    await shot(page, 'detail-mobile');
    report.mobile = { width: 320, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) };
    expect(report.mobile.overflow).toBe(false);
    await context.storageState({ path: path.join(path.dirname(path.resolve(process.argv[2])), 'browser-auth.json') });
    await fs.writeFile(path.join(output, 'live-report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
} finally {
    await browser.close();
}
