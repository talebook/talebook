// 真实浏览器验证「阅读」按钮：点击后是否打开阅读器页面。
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

    // 带登录态直接请求 /read/1
    const read = await page.request.get('/read/1');
    report.checks.readStatus = read.status();
    report.checks.readContentType = read.headers()['content-type'];
    const readBody = await read.text();
    report.checks.readIsHTML = readBody.includes('<!DOCTYPE html>');
    report.checks.readBodyHead = readBody.slice(0, 300);

    // 真实点击「阅读」按钮
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const readBtn = page.getByTestId('open-online-reader');
    report.checks.readButtonHref = await readBtn.getAttribute('href');

    const [readerPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 20000 }).catch(() => null),
        readBtn.click(),
    ]);
    if (readerPage) {
        await readerPage.waitForLoadState('domcontentloaded').catch(() => {});
        await readerPage.waitForTimeout(5000);
        report.checks.readerUrl = readerPage.url();
        const txt = await readerPage.locator('body').innerText().catch(() => '');
        report.checks.readerText = txt.slice(0, 300);
        report.checks.readerHasApp = await readerPage.locator('#app').count() > 0;
        report.checks.readerTitle = await readerPage.title();
        await readerPage.screenshot({ path: path.join(output, '50-reader.png'), fullPage: true });
    } else {
        report.checks.readerUrl = '(未打开新标签页)';
    }

} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
} finally {
    await fs.writeFile(path.join(output, 'reader-page-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}