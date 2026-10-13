// 登录态前端验证：真实 Nuxt + 真实 booksvr 后端，走真实登录流程。
//
// 覆盖此前遗漏的「登录后页面」：书架、阅读状态、管理后台、插件配置。
// 不使用 mock，不替换任何 API。
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/auth-e2e');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const USERNAME = 'e2e_admin';
const PASSWORD = 'AdminPass123';

const report = {
    timestamp: new Date().toISOString(),
    backend: 'real booksvr + real Calibre',
    mocks: false,
    loggedIn: false,
    pages: [],
    apiChecks: [],
    errors: [],
};

await fs.mkdir(output, { recursive: true });

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const context = await browser.newContext({
    baseURL,
    locale: 'zh-CN',
    viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();

page.on('console', (msg) => {
    if (msg.type() === 'error') report.errors.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => report.errors.push(`pageerror: ${err.message}`));

async function shot(name) {
    await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
}

async function api(url, options = {}) {
    const response = await context.request.get(url, { timeout: 60000, ...options });
    const data = await response.json();
    report.apiChecks.push({ url, err: data.err, status: response.status() });
    return data;
}

try {
    // ---- 1. 真实登录（走前端登录页，不是直接调 API） ----
    console.log('1. 打开登录页');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await shot('01-login-page');

    console.log('2. 填写并提交登录表单');
    await page.getByLabel(/用户名|账号/).first().fill(USERNAME);
    await page.getByLabel(/密码/).first().fill(PASSWORD);
    await page.getByRole('button', { name: /登录|登入/ }).first().click();

    // 登录成功后应离开登录页
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    report.loggedIn = true;
    console.log('   登录成功，当前 URL:', page.url());
    await shot('02-after-login');

    // ---- 3. 登录态 API 校验 ----
    console.log('3. 登录态 API 校验');
    const info = await api('/api/user/info');
    report.userInfo = { err: info.err, is_login: info.is_login, name: info.name, is_admin: info.is_admin };

    const shelf = await api('/api/shelf');
    report.shelf = { err: shelf.err, count: (shelf.books || []).length };

    const scoped = await api('/api/scopedbooks?scope=public');
    report.scoped = { err: scoped.err, count: (scoped.books || []).length };

    const adminBooks = await api('/api/admin/book/list');
    report.adminBooks = { err: adminBooks.err, total: adminBooks.total };

    // ---- 4. 登录后页面渲染 ----
    console.log('4. 登录后页面渲染');
    const pages = [
        ['/', '首页'],
        ['/book/1', '书籍详情'],
        ['/me/shelf', '我的书架'],
        ['/me', '个人中心'],
        ['/me/account', '账号设置'],
        ['/me/history', '阅读历史'],
        ['/admin/books', '图书管理'],
        ['/admin/plugins', '插件管理'],
        ['/admin/users', '用户管理'],
        ['/admin/settings', '系统设置'],
        ['/admin/imports', '导入管理'],
        ['/admin/booksources', '书源管理'],
    ];
    for (const [url, label] of pages) {
        console.log('   访问', url, label);
        const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const bodyText = await page.locator('body').innerText().catch(() => '');
        const entry = {
            url,
            label,
            status: resp ? resp.status() : null,
            title: await page.title(),
            textLength: bodyText.length,
            hasError: /500|Internal Server Error|服务器错误/.test(bodyText),
            snippet: bodyText.slice(0, 200).replace(/\s+/g, ' '),
        };
        report.pages.push(entry);
        await shot(`page-${url.replace(/[^a-z0-9]/gi, '_') || 'root'}`);
    }

    // ---- 5. 登录态下的写操作（通过前端 UI 触发） ----
    console.log('5. 详情页收藏按钮');
    await page.goto('/book/1', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    // 收藏按钮可能是 button 或带图标的可点击元素，宽松匹配。
    const favCandidates = page.locator('button, .v-btn').filter({ hasText: /收藏|已收藏/ });
    const favCount = await favCandidates.count();
    report.favoriteButtonCount = favCount;
    if (favCount > 0) {
        await favCandidates.first().click();
        await page.waitForTimeout(2000);
        report.favoriteClicked = true;
        await shot('05-after-favorite');
    } else {
        report.favoriteClicked = false;
        // 记录页面上实际可见的按钮文案，便于定位
        report.visibleButtons = await page.locator('button, .v-btn').allInnerTexts();
    }

    // 读回确认
    const book = await api('/api/book/1');
    report.bookState = book.book ? book.book.state : null;

} catch (err) {
    report.errors.push(`fatal: ${err.message}`);
    await shot('99-failure');
} finally {
    await fs.writeFile(path.join(output, 'auth-report.json'), JSON.stringify(report, null, 2));
    console.log('\n=== 报告 ===');
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}