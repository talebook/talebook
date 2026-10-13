// 完整界面流程验证：导入 → 下载 → 删除。
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

const shot = (n) => page.screenshot({ path: path.join(output, `${n}.png`), fullPage: true });

try {
    // ---- 登录 ----
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.steps.push('登录成功');

    // ---- 导入 ----
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
        if (/导入完成|处理完毕/.test(await page.locator('body').innerText())) break;
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);
    const impText = await page.locator('body').innerText();
    report.checks.imported = /已导入 \(1\)/.test(impText);
    report.checks.importFailed = /失败 \(0\)/.test(impText);
    await shot('20-imported');

    // ---- 下载（关键：书能不能打开）----
    const dl = await page.request.get('/api/book/1.MOBI');
    const dlBody = await dl.body();
    report.checks.downloadStatus = dl.status();
    report.checks.downloadContentType = dl.headers()['content-type'];
    report.checks.downloadBytes = dlBody.length;
    report.checks.downloadIsFile = !String(dl.headers()['content-type'] || '').includes('json');
    report.checks.downloadDisposition = dl.headers()['content-disposition'] || '';
    // MOBI 文件头魔数（前 16 字节）
    report.checks.downloadMagic = dlBody.slice(0, 16).toString('hex');

    // ---- 详情页 ----
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await shot('21-detail');
    const detail = await page.locator('body').innerText();
    report.checks.detailTitle = detail.includes('红星照耀中国');

    // ---- 删除 ----
    const del = await page.request.post('/api/book/1/delete');
    report.checks.deleteStatus = del.status();
    report.checks.deleteBody = (await del.text()).slice(0, 200);

    // 删除后应查不到
    const after = await page.request.get('/api/book/1');
    report.checks.afterDeleteBody = (await after.text()).slice(0, 120);

} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
    await shot('99-failure');
} finally {
    await fs.writeFile(path.join(output, 'full-flow-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}