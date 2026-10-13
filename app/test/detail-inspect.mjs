// 抓取书籍详情页的真实渲染内容与网络请求，定位「作者/出版社/封面不显示」。
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/detail');
await fs.mkdir(output, { recursive: true });

const report = { api: {}, requests: [], errors: [] };
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ baseURL, locale: 'zh-CN', viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();

page.on('response', async (r) => {
    const u = r.url();
    if (u.includes('/api/') || u.includes('/get/')) {
        report.requests.push({ status: r.status(), url: u.replace(baseURL, ''), ct: r.headers()['content-type'] });
    }
});
page.on('pageerror', (e) => report.errors.push(e.message.slice(0, 200)));

try {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });

    // 导入
    await page.goto('/admin/imports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: /扫描|开始扫描/ }).first().click();
    for (let i = 0; i < 40; i++) {
        if (/处理完毕|扫描完成/.test(await page.locator('body').innerText())) break;
        await page.waitForTimeout(1000);
    }
    const cb = page.getByRole('button', { name: /^关闭$/ }).first();
    if (await cb.count() > 0) { await cb.click(); await page.waitForTimeout(1200); }
    await page.getByRole('button', { name: /导入全部书籍/ }).first().click();
    for (let i = 0; i < 60; i++) {
        if (/处理完毕/.test(await page.locator('body').innerText())) break;
        await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);

    // 详情页 API
    const api = await page.request.get('/api/book/1');
    report.api.status = api.status();
    report.api.body = await api.json();

    // 封面接口
    const cover = await page.request.get('/get/cover/1.jpg');
    report.api.coverStatus = cover.status();
    report.api.coverType = cover.headers()['content-type'];
    report.api.coverBytes = (await cover.body()).length;

    // 渲染详情页
    report.requests = [];
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(output, 'detail-full.png'), fullPage: true });

    // 抓取详情页可见文本
    report.renderedText = (await page.locator('body').innerText()).slice(0, 1500);

    // 抓取详情信息区（dl/dt/dd）
    report.detailRows = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('dt').forEach((dt) => {
            const dd = dt.nextElementSibling;
            out.push({ label: dt.textContent.trim(), value: dd ? dd.textContent.trim().slice(0, 80) : '(无)' });
        });
        return out;
    });

    // 封面 img 元素
    report.coverImgs = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img')).map((i) => ({
            src: i.getAttribute('src'), natural: i.naturalWidth, complete: i.complete,
        })).slice(0, 10));

} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
} finally {
    await fs.writeFile(path.join(output, 'detail-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}