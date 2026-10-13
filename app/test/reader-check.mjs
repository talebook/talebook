// 验证「阅读」按钮：/read/<id> 是否真的能打开阅读器。
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/import-ui');
const report = { steps: [], errors: [], checks: {} };
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ baseURL, locale: 'zh-CN', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.on('pageerror', (e) => report.errors.push(`pageerror: ${e.message}`));

try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.steps.push('登录成功');

    // 详情页 API 字段完整性
    const api = await page.request.get('/api/book/1');
    const body = await api.json();
    report.checks.apiKeys = Object.keys(body).sort();
    report.checks.bookKeys = Object.keys(body.book || {}).sort();
    report.checks.kindleSender = body.kindle_sender;
    report.checks.conversionOptions = body.conversion_options;
    report.checks.aliases = body.book?.aliases;
    report.checks.scope = body.book?.scope;
    report.checks.mediaType = body.book?.media_type;
    report.checks.authorSort = body.book?.author_sort;
    report.checks.thumb = body.book?.thumb;
    report.checks.timestamp = body.book?.timestamp;
    report.checks.authorUrl = body.book?.author_url;

    // 阅读按钮：/read/1
    const read = await page.request.get('/read/1');
    report.checks.readStatus = read.status();
    report.checks.readContentType = read.headers()['content-type'];
    const readBody = await read.text();
    report.checks.readBodyHead = readBody.slice(0, 400);

    // 真实点击「阅读」按钮
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(output, '30-detail.png'), fullPage: true });

    const readBtn = page.getByTestId('open-online-reader');
    report.checks.readButtonHref = await readBtn.getAttribute('href');

    const [readerPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 15000 }).catch(() => null),
        readBtn.click(),
    ]);
    if (readerPage) {
        await readerPage.waitForLoadState('domcontentloaded').catch(() => {});
        await readerPage.waitForTimeout(3000);
        report.checks.readerUrl = readerPage.url();
        report.checks.readerText = (await readerPage.locator('body').innerText().catch(() => '')).slice(0, 400);
        await readerPage.screenshot({ path: path.join(output, '31-reader.png'), fullPage: true });
    } else {
        report.checks.readerUrl = '(未打开新标签页)';
    }

} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
} finally {
    await fs.writeFile(path.join(output, 'reader-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}