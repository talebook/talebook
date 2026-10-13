// 全站页面遍历：逐页访问，记录 HTTP 状态、控制台错误、页面错误。
//
// 目的：把界面上每个功能入口都实际打开一遍，找出「页面能开但功能坏了」的问题。
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/sweep');

// 需要登录才能访问的页面统一用管理员身份。
const PAGES = [
    // 公开页
    '/', '/library', '/recent', '/hot', '/nav', '/search',
    '/author', '/publisher', '/tag', '/series', '/rating', '/format',
    '/opds-readme', '/webdav-readme', '/welcome',
    // 书籍相关
    '/book/1', '/book/1/edit', '/book/1/annotations', '/book/1/audios', '/book/1/verify',
    // 我的
    '/me', '/me/account', '/me/devices', '/me/history', '/me/plugins', '/me/private', '/me/shelf',
    // 有声书
    '/audios', '/audios/create', '/audio-jobs',
    // 网络书源
    '/network', '/library/network', '/library/local', '/library/apps',
    // 插件
    '/plugins', '/plugins/brs', '/plugins/legado', '/plugins/weread',
    '/plugins/zh-converter', '/plugins/txt-fixer', '/plugins/text-replace', '/plugins/epub-beautify',
    // 管理端
    '/admin/books', '/admin/imports', '/admin/users', '/admin/trash', '/admin/logs',
    '/admin/themes', '/admin/booksources',
    '/admin/settings', '/admin/settings/general', '/admin/settings/plugins', '/admin/settings/themes',
    '/admin/plugins', '/admin/plugins/runs',
    // 其他
    '/scopedbooks', '/user/detail', '/user/history', '/user/shelf',
];

const report = { pages: [], errors: [] };
await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const context = await browser.newContext({ baseURL, locale: 'zh-CN', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

let consoleErrors = [];
let pageErrors = [];
let failedRequests = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));
page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));
page.on('response', (r) => {
    if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.request().method()} ${r.url()}`);
});

try {
    // 登录
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill('e2e_admin');
    await page.getByLabel(/密码/).first().fill('AdminPass123');
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.login = 'ok';

    for (const p of PAGES) {
        consoleErrors = []; pageErrors = []; failedRequests = [];
        const entry = { path: p };
        try {
            const resp = await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 20000 });
            entry.status = resp ? resp.status() : null;
            await page.waitForTimeout(1800);
            const body = await page.locator('body').innerText().catch(() => '');
            entry.textLen = body.length;
            entry.textHead = body.slice(0, 150).replace(/\s+/g, ' ');
            // 页面是否显示错误提示
            entry.hasError = /失败|错误|异常|不存在|无权|error|Error/.test(body.slice(0, 800));
            entry.consoleErrors = [...new Set(consoleErrors)];
            entry.pageErrors = [...new Set(pageErrors)];
            entry.failedRequests = [...new Set(failedRequests)].slice(0, 8);
        } catch (e) {
            entry.fatal = e.message.slice(0, 200);
        }
        report.pages.push(entry);
        const flag = (entry.status && entry.status >= 400) || entry.fatal || entry.pageErrors?.length ? 'FAIL' : 'ok';
        console.log(`[${flag}] ${p} status=${entry.status} len=${entry.textLen} errs=${entry.pageErrors?.length || 0}/${entry.consoleErrors?.length || 0}`);
    }
} catch (e) {
    report.errors.push(`fatal: ${e.message}`);
} finally {
    await fs.writeFile(path.join(output, 'sweep-report.json'), JSON.stringify(report, null, 2));
    const bad = report.pages.filter((p) => p.fatal || (p.status && p.status >= 400) || p.pageErrors?.length);
    console.log(`\n=== 汇总：${report.pages.length} 页，${bad.length} 页有问题 ===`);
    for (const b of bad) console.log(`  ${b.path}: status=${b.status} fatal=${b.fatal || '-'} pageErr=${b.pageErrors?.[0] || '-'}`);
    await browser.close();
}