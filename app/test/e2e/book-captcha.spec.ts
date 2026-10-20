import { expect, test } from '@playwright/test';

const configuration = { enabled: true, provider: 'turnstile', siteKey: 'test-site', scenes: { read: true, download: true } };
const targetQuery = (target: string) => Buffer.from(target).toString('base64url');

test.beforeEach(async ({ page, request }) => {
    await request.post('http://127.0.0.1:18082/_test/reset', { data: { installed: true } });
    await page.route('**/api/themes/active', route => route.fulfill({ json: { err: 'ok', theme: null } }));
    await page.route('**/api/captcha/config', route => route.fulfill({ json: { err: 'ok', config: configuration, scenes: configuration.scenes } }));
    // This fixture isolates page rendering and lifecycle; Siteverify is covered by backend tests.
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => route.fulfill({
        contentType: 'application/javascript',
        body: `window.turnstile = {
            render(selector, options) {
                window.testTurnstile = options;
                const width = options.size === 'compact' ? 150 : 300;
                const height = options.size === 'compact' ? 140 : 65;
                document.querySelector(selector).innerHTML = '<button type="button" id="solve-challenge" style="width:' + width + 'px;height:' + height + 'px">完成验证</button>';
                document.querySelector('#solve-challenge').onclick = () => options.callback('browser-token');
                return 'test-widget';
            }, reset() {}, remove() {}
        };`,
    }));
});

test('read verification preserves reader parameters and needs server approval', async ({ page }) => {
    let submitted = '';
    await page.route('**/api/captcha/verify', route => {
        submitted = route.request().postData() || '';
        return route.fulfill({ json: { err: 'ok' } });
    });
    await page.route(url => url.pathname === '/read/1', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>阅读目标</h1>' }));
    await page.goto('/book/1/verify?scene=read&next_b64=' + targetQuery('/read/1?reader=readest&cfi=abc'));
    await expect(page.getByRole('heading', { name: '人机验证' })).toBeVisible();
    await page.getByRole('button', { name: '验证并继续' }).click();
    await expect(page.getByText('请完成人机验证', { exact: true }).first()).toBeVisible();
    await page.locator('#solve-challenge').click();
    await expect(page.getByRole('status')).toHaveText('验证已完成，请继续。');
    await page.getByRole('button', { name: '验证并继续' }).focus();
    await expect(page.getByRole('button', { name: '验证并继续' })).toBeFocused();
    await page.screenshot({ path: '../../captcha-verification-ready.png', fullPage: true });
    await page.getByRole('button', { name: '验证并继续' }).press('Enter');
    await expect(page.getByRole('heading', { name: '阅读目标' })).toBeVisible();
    expect(new URL(page.url()).searchParams.get('cfi')).toBe('abc');
    expect(new URL(page.url()).searchParams.get('reader')).toBe('readest');
    expect(new URLSearchParams(submitted).get('turnstile_token')).toBe('browser-token');
    expect(new URLSearchParams(submitted).get('scene')).toBe('read');
    expect(new URLSearchParams(submitted).get('book_id')).toBe('1');
});

test('expired proof and rejected download verification require retry on a narrow screen', async ({ page, context }) => {
    await context.addCookies([{ name: 'theme', value: 'dark', url: 'http://127.0.0.1:13001' }]);
    await page.setViewportSize({ width: 320, height: 700 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.route('**/api/captcha/verify', route => route.fulfill({ json: { err: 'captcha.invalid', msg: '验证失败，请重试' } }));
    await page.goto('/book/1/verify?scene=download&next_b64=' + targetQuery('/api/book/1.epub'));
    await page.locator('#solve-challenge').click();
    expect(await page.evaluate(() => (window as any).testTurnstile.size)).toBe('compact');
    await page.evaluate(() => (window as any).testTurnstile['expired-callback']());
    await expect(page.getByText('验证已过期，请重新验证', { exact: true })).toBeVisible();
    await page.locator('#solve-challenge').click();
    await page.getByRole('button', { name: '验证并继续' }).click();
    await expect(page.getByText('验证失败，请重试', { exact: true })).toBeVisible();
    expect(page.url()).toContain('/verify');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('[data-testid=book-captcha-page]')).toHaveClass(/v-theme--dark/);
    await page.screenshot({ path: '../../captcha-verification-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 640, height: 1400 });
    await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
    const card = await page.locator('[data-testid=book-captcha-page]').boundingBox();
    expect(card!.x).toBeGreaterThanOrEqual(0);
    expect(card!.x + card!.width).toBeLessThanOrEqual(640);
});

test('SDK failure offers a working retry action', async ({ page }) => {
    let fail = true;
    await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', route => fail ? route.abort() : route.fallback());
    await page.goto('/book/1/verify?scene=read');
    await expect(page.getByText('验证码加载失败', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '刷新' })).toBeVisible();
    await page.screenshot({ path: '../../captcha-verification-sdk-error.png', fullPage: true });
    fail = false;
    await page.getByRole('button', { name: '刷新' }).click();
    await expect(page.locator('#solve-challenge')).toBeVisible();
    await expect(page.getByText('验证码加载失败', { exact: true })).not.toBeVisible();
});

test('loading and misconfiguration can recover with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/api/captcha/config', route => route.fulfill({ json: { err: 'ok', config: null, scenes: configuration.scenes } }));
    await page.goto('/book/1/verify?scene=read');
    await expect(page.getByText('人机验证未正确配置，请联系管理员。', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '验证并继续' })).toBeDisabled();
    let release: (() => void) | undefined;
    await page.route('**/api/captcha/config', route => {
        release = () => { void route.fulfill({ json: { err: 'ok', config: configuration, scenes: configuration.scenes } }); };
    });
    await page.getByRole('button', { name: '刷新', exact: true }).click();
    const progress = page.getByRole('progressbar', { name: '加载中...', exact: true });
    await expect(progress).toBeAttached();
    await expect(progress).toBeVisible();
    const animations = await progress.locator('.v-progress-linear__indeterminate').evaluateAll(elements => elements.map(element => getComputedStyle(element).animationName));
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.every(animation => animation === 'none')).toBe(true);
    await expect.poll(() => Boolean(release)).toBe(true);
    release!();
    await expect(page.locator('#solve-challenge')).toBeVisible();
});
