// 真实界面导入验证：用浏览器点击「导入图书」页面完成扫描与导入。
//
// 不使用 curl 直接打 API，全部通过界面操作触发。
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const output = path.resolve(process.argv[2] || '../document/screenshots/import-ui');
const executablePath = process.env.CHROMIUM_EXECUTABLE;

const USERNAME = 'e2e_admin';
const PASSWORD = 'AdminPass123';

const report = {
    timestamp: new Date().toISOString(),
    backend: 'real booksvr + real Calibre',
    mocks: false,
    steps: [],
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

function step(name, detail) {
    report.steps.push({ name, detail });
    console.log(`[step] ${name}: ${detail}`);
}

try {
    // ---- 1. 登录 ----
    console.log('1. 登录');
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/用户名|账号/).first().fill(USERNAME);
    await page.getByLabel(/密码/).first().fill(PASSWORD);
    await page.getByRole('button', { name: /登录|登入/ }).first().click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
    step('login', '登录成功');

    // ---- 2. 打开导入页面 ----
    console.log('2. 打开导入页面');
    await page.goto('/admin/imports', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await shot('01-imports-page');

    const bodyText = await page.locator('body').innerText();
    report.importsPageText = bodyText.slice(0, 600);
    step('open-imports', `页面文本长度 ${bodyText.length}`);

    // ---- 3. 点击「扫描」按钮 ----
    console.log('3. 点击扫描');
    const scanBtn = page.getByRole('button', { name: /扫描|开始扫描/ }).first();
    if (await scanBtn.count() === 0) {
        report.errors.push('未找到扫描按钮');
        report.availableButtons = await page.locator('button').allInnerTexts();
    } else {
        await scanBtn.click();
        step('click-scan', '已点击扫描按钮');
        await page.waitForTimeout(3000);
        await shot('02-after-scan');
    }

    // ---- 4. 等待扫描完成，并关闭进度弹窗 ----
    console.log('4. 等待扫描完成');
    for (let i = 0; i < 40; i++) {
        const text = await page.locator('body').innerText();
        if (/处理完毕|扫描完成/.test(text)) break;
        await page.waitForTimeout(1000);
    }
    await shot('03-scan-done');
    report.afterScanText = (await page.locator('body').innerText()).slice(0, 800);

    // 扫描进度弹窗会留下 v-overlay__scrim 遮罩，必须先关掉才能点导入。
    const closeBtn = page.getByRole('button', { name: /^关闭$/ }).first();
    if (await closeBtn.count() > 0) {
        await closeBtn.click();
        step('close-scan-dialog', '已关闭扫描进度弹窗');
        await page.waitForTimeout(1500);
    }
    const scrim = page.locator('.v-overlay__scrim');
    if (await scrim.count() > 0) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
    }
    await shot('03b-dialog-closed');

    // ---- 5. 点击「导入」按钮 ----
    console.log('5. 点击导入');
    const importBtn = page.getByRole('button', { name: /导入全部书籍|导入到书库|开始导入/ }).first();
    if (await importBtn.count() === 0) {
        report.errors.push('未找到导入按钮');
        report.availableButtons2 = await page.locator('button').allInnerTexts();
    } else {
        await importBtn.click();
        step('click-import', '已点击导入按钮');
        await page.waitForTimeout(3000);
        await shot('04-after-import');
    }

    // ---- 6. 等待导入完成 ----
    console.log('6. 等待导入完成');
    for (let i = 0; i < 60; i++) {
        const text = await page.locator('body').innerText();
        if (/导入完成|已完成|成功/.test(text)) break;
        await page.waitForTimeout(1000);
    }
    await shot('05-import-done');
    report.afterImportText = (await page.locator('body').innerText()).slice(0, 800);

    // ---- 7. 去书库确认 ----
    console.log('7. 检查书库');
    await page.goto('/admin/books', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await shot('06-admin-books');
    report.booksPageText = (await page.locator('body').innerText()).slice(0, 800);

} catch (err) {
    report.errors.push(`fatal: ${err.message}`);
    await shot('99-failure');
} finally {
    await fs.writeFile(path.join(output, 'import-report.json'), JSON.stringify(report, null, 2));
    console.log('\n=== 报告 ===');
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
}