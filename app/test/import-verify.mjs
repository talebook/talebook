// 导入后验证：通过真实界面确认书籍可读、可下载。
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
    // 登录
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.steps.push('登录成功');

    // 首页应显示刚导入的书
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const home = await page.locator('body').innerText();
    report.checks.homeShowsBook = home.includes('红星照耀中国');
    await page.screenshot({ path: path.join(output, '10-home-with-book.png'), fullPage: true });

    // 详情页
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    const detail = await page.locator('body').innerText();
    report.checks.detailTitle = detail.includes('红星照耀中国');
    report.checks.detailAuthor = detail.includes('佚名');
    await page.screenshot({ path: path.join(output, '11-book-detail.png'), fullPage: true });

    // 封面接口（has_cover=0，预期 404/占位，不算失败）
    const coverResp = await page.request.get('/get/cover/1.jpg');
    report.checks.coverStatus = coverResp.status();

    // 下载接口：这是文件真实存在于库内的关键证据
    const dl = await page.request.get('/get/book/1.mobi');
    report.checks.downloadStatus = dl.status();
    if (dl.ok()) {
        const body = await dl.body();
        report.checks.downloadBytes = body.length;
        report.checks.downloadMagic = body.slice(0, 16).toString('hex');
    }

    // 书库浏览页
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(output, '12-library.png'), fullPage: true });
    report.checks.libraryShowsBook = (await page.locator('body').innerText()).includes('红星照耀中国');

} catch (err) {
    report.errors.push(`fatal: ${err.message}`);
    await page.screenshot({ path: path.join(output, '99-verify-failure.png'), fullPage: true });
} finally {
    await fs.writeFile(path.join(output, 'verify-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}