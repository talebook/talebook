// 验证下载文件名：浏览器实际保存成什么名字。
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/import-ui');
const report = { steps: [], errors: [], checks: {} };
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ baseURL, locale: 'zh-CN', acceptDownloads: true });
const page = await context.newPage();

try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.steps.push('登录成功');

    // 导入
    await page.goto('/admin/imports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /扫描|开始扫描/ }).first().click();
    for (let i = 0; i < 40; i++) {
        if (/处理完毕|扫描完成/.test(await page.locator('body').innerText())) break;
        await page.waitForTimeout(1000);
    }
    const closeBtn = page.getByRole('button', { name: /^关闭$/ }).first();
    if (await closeBtn.count() > 0) { await closeBtn.click(); await page.waitForTimeout(1200); }
    await page.getByRole('button', { name: /导入全部书籍/ }).first().click();
    for (let i = 0; i < 60; i++) {
        if (/处理完毕/.test(await page.locator('body').innerText())) break;
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
    report.steps.push('导入完成');

    // 详情页 API 字段
    const api = await page.request.get('/api/book/1');
    const body = await api.json();
    report.checks.topLevelKeys = Object.keys(body).sort();
    report.checks.bookKeys = Object.keys(body.book || {}).sort();
    report.checks.kindleSender = body.kindle_sender;
    report.checks.conversionOptionsCount = (body.conversion_options || []).length;
    report.checks.aliases = body.book?.aliases;
    report.checks.scope = body.book?.scope;
    report.checks.mediaType = body.book?.media_type;
    report.checks.authorSort = body.book?.author_sort;
    report.checks.thumb = body.book?.thumb;
    report.checks.timestamp = body.book?.timestamp;
    report.checks.authorUrl = body.book?.author_url;
    report.checks.publisherUrl = body.book?.publisher_url;
    report.checks.onlineReadable = body.book?.online_readable;
    report.checks.isOwner = body.book?.is_owner;

    // 真实点击下载，捕获浏览器保存的文件名
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(output, '40-detail.png'), fullPage: true });

    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.getByTestId('book-action-download').click().then(async () => {
            await page.waitForTimeout(800);
            const item = page.locator('[data-testid="book-download-dialog"] a').first();
            if (await item.count() > 0) await item.click();
        }),
    ]);
    report.checks.downloadSuggestedFilename = download.suggestedFilename();
    const savePath = path.join(output, 'downloaded.bin');
    await download.saveAs(savePath);
    const st = await fs.stat(savePath);
    report.checks.downloadedBytes = st.size;

} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
} finally {
    await fs.writeFile(path.join(output, 'filename-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}