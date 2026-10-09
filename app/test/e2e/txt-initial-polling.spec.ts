import { test, expect, type Page } from '@playwright/test';

const ready = {
    err: 'ok', msg: '已解析',
    data: { name: '排队测试', content: [{ title: '第一章', start: 0, end: -1 }] },
};

async function mockReader(page: Page, wait = 30, que = 2) {
    const calls = { initial: 0, polls: 0, chapters: 0 };
    await page.route('**/api/book/2', route => route.fulfill({ json: { err: 'ok', book: { files: [{ format: 'txt' }] } } }));
    await page.route('**/api/read/txt?*', route => {
        calls.chapters++;
        return route.fulfill({ json: { err: 'ok', content: '等待结束后的正文。' } });
    });
    await page.route('**/api/book/txt/init?*', route => {
        if (new URL(route.request().url()).searchParams.get('test') === '0') {
            calls.initial++;
            return route.fulfill({ json: { err: 'ok', msg: '已加入队列', data: { wait, que, name: '排队测试' } } });
        }
        calls.polls++;
        return route.fulfill({ json: { err: 'ok', msg: '未解析完成' } });
    });
    return calls;
}

async function openReader(page: Page, waitForPrepared = true) {
    await page.clock.install();
    await page.goto('/book/2/readtxt');
    await expect(page.locator('.content-area [role="status"]')).toBeVisible();
    if (waitForPrepared) await expect(page.locator('.v-toolbar-title')).toContainText('排队测试');
}

async function tickAndPoll(page: Page, calls: { polls: number }) {
    const previous = calls.polls;
    await page.clock.runFor(5000);
    await expect.poll(() => calls.polls).toBe(previous + 1);
    // Wait for the HTTP response and async callback before advancing the clock again.
    await page.waitForTimeout(100);
}

test.beforeEach(async ({ request }) => {
    await request.post('http://127.0.0.1:8080/_test/reset', { data: { installed: true, loggedIn: false } });
});

test('keeps polling beyond the estimate and opens exactly once when ready', async ({ page }) => {
    const calls = await mockReader(page, 30, 2);
    await openReader(page);
    await expect(page.getByText('入队时前方有 2 个等待任务')).toBeVisible();
    await page.screenshot({ path: 'test/e2e/screenshots/20261009-txt-queued.png', fullPage: true });
    for (let i = 0; i < 28; i++) await tickAndPoll(page, calls);
    await expect(page.getByText('仍在准备目录')).toBeVisible();
    await expect(page.getByText('解析超时')).toHaveCount(0);
    await page.screenshot({ path: 'test/e2e/screenshots/20261009-txt-waiting.png', fullPage: true });
    await page.route('**/api/book/txt/init?*test=1', route => {
        calls.polls++;
        return route.fulfill({ json: ready });
    });
    await tickAndPoll(page, calls);
    await expect(page.locator('.novel-content')).toContainText('等待结束后的正文');
    await page.screenshot({ path: 'test/e2e/screenshots/20261009-txt-ready.png', fullPage: true });
    const count = calls.polls;
    await page.clock.runFor(20000);
    expect(calls.polls).toBe(count);
    expect(calls.initial).toBe(1);
    expect(calls.chapters).toBe(1);
});

for (const wait of [0, 1]) {
    test(`wait=${wait} still polls after zero without a negative countdown`, async ({ page }) => {
        const calls = await mockReader(page, wait, 0);
        await openReader(page);
        await tickAndPoll(page, calls);
        await expect(page.getByText('仍在准备目录')).toBeVisible();
        await page.route('**/api/book/txt/init?*test=1', route => route.fulfill({ json: ready }));
        await page.clock.runFor(5000);
        await expect(page.locator('.novel-content')).toContainText('等待结束后的正文');
        expect(calls.chapters).toBe(1);
    });
}

test('slow readiness requests never overlap', async ({ page }) => {
    const calls = await mockReader(page, 0);
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/book/txt/init?*test=1', async route => {
        calls.polls++;
        await pending;
        await route.fulfill({ json: { err: 'ok', msg: '未解析完成' } });
    });
    await openReader(page);
    await page.clock.runFor(5000);
    await expect.poll(() => calls.polls).toBe(1);
    await page.clock.runFor(30000);
    expect(calls.polls).toBe(1);
    release();
    await page.waitForTimeout(100);
    await tickAndPoll(page, calls);
});

for (const phase of ['initial', 'poll', 'format']) {
    test(`leaving during ${phase} ignores late responses and stops requests`, async ({ page }) => {
        const calls = await mockReader(page, 0);
        let release!: () => void;
        let started = false;
        const pending = new Promise<void>(resolve => { release = resolve; });
        const pattern = phase === 'format' ? '**/api/book/2' : `**/api/book/txt/init?*test=${phase === 'initial' ? '0' : '1'}`;
        await page.route(pattern, async route => {
            started = true;
            await pending;
            await route.fulfill({ json: phase === 'format' ? { err: 'ok', book: { files: [{ format: 'txt' }] } } : ready }).catch(() => {});
        });
        await openReader(page, phase === 'poll');
        if (phase === 'poll') await page.clock.runFor(5000);
        await expect.poll(() => started).toBe(true);
        // A real router link exercises onUnmounted rather than closing the browser.
        await page.getByRole('link', { name: '请登录' }).click();
        await expect(page).toHaveURL(/\/login$/);
        const initial = calls.initial;
        const polls = calls.polls;
        release();
        await page.waitForTimeout(100);
        await page.clock.runFor(20000);
        expect(calls.initial).toBe(initial);
        expect(calls.polls).toBe(polls);
        expect(calls.chapters).toBe(0);
    });
}

test('explicit readiness errors stop polling and show the reason', async ({ page }) => {
    const calls = await mockReader(page, 0);
    await page.route('**/api/book/txt/init?*test=1', route => {
        calls.polls++;
        return route.fulfill({ json: { err: 'format error', msg: '非txt书籍' } });
    });
    await openReader(page);
    await tickAndPoll(page, calls);
    await expect(page.getByText('非txt书籍')).toBeVisible();
    await page.clock.runFor(20000);
    expect(calls.polls).toBe(1);
});

test('cached readiness opens immediately without polling', async ({ page }) => {
    const calls = await mockReader(page);
    await page.route('**/api/book/txt/init?*test=0', route => route.fulfill({ json: ready }));
    await page.goto('/book/2/readtxt');
    await expect(page.locator('.novel-content')).toContainText('等待结束后的正文');
    expect(calls.polls).toBe(0);
    expect(calls.chapters).toBe(1);
});

test('narrow dark waiting state fits the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await mockReader(page, 0);
    await page.goto('/book/2/readtxt');
    await expect(page.getByText('仍在准备目录')).toBeVisible();
    await page.locator('.v-app-bar button').nth(1).click();
    await expect(page.locator('#txt-main')).toHaveClass(/v-theme--dark/);
    const box = await page.locator('.content-area [role="status"]').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'test/e2e/screenshots/20261009-txt-mobile-dark.png', fullPage: true });
});

test('leaving between polls clears the pending timer', async ({ page }) => {
    const calls = await mockReader(page, 0);
    await openReader(page);
    await tickAndPoll(page, calls);
    await page.getByRole('link', { name: '请登录' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.clock.runFor(20000);
    expect(calls.polls).toBe(1);
    expect(calls.chapters).toBe(0);
});

test('network failure stops readiness polling without an unhandled rejection', async ({ page }) => {
    const calls = await mockReader(page, 0);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/book/txt/init?*test=1', route => {
        calls.polls++;
        return route.abort('failed');
    });
    await openReader(page);
    await tickAndPoll(page, calls);
    await expect(page.getByText('无法获取阅读内容')).toBeVisible();
    await page.clock.runFor(20000);
    expect(calls.polls).toBe(1);
    expect(errors).toEqual([]);
});

for (const [locale, message] of [
    ['en-US', 'The table of contents is still being prepared.'],
    ['ru-RU', 'Оглавление ещё готовится.'],
]) {
    test(`${locale} waiting message wraps at narrow width and 200% scale`, async ({ page, context }) => {
        await context.addCookies([{ name: 'i18n_redirected', value: locale, url: 'http://127.0.0.1:9000' }]);
        await page.setViewportSize({ width: 640, height: 900 });
        await mockReader(page, 0);
        await page.goto('/book/2/readtxt');
        await expect(page.getByText(message, { exact: false })).toBeVisible();
        await page.evaluate(() => { document.body.style.zoom = '2'; });
        const card = page.locator('.content-area [role="status"]');
        const box = await card.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(640);
        await expect(card).not.toContainText('book.preparing');
        await page.screenshot({ path: test.info().outputPath(`${locale}-zoom.png`), fullPage: true });
    });
}
