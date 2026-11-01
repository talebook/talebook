import { expect, test } from '@playwright/test';

test('discovery edits, saved intent, publication error and mobile preview', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const failures: string[] = [];
    page.on('requestfailed', request => failures.push(request.url()));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    let status = {
        err: 'ok', enabled: false, name: 'Talebook Mock', endpoints: [] as Record<string, unknown>[],
        overridden: [] as string[], interfaces: { eth0: { addresses: ['192.168.50.10'], index: 2 } },
        status: { state: 'disabled', error: null as string | null, instance_id: null },
    };
    await page.route('**/api/admin/discovery', route => route.fulfill({ json: status }));
    await page.route('**/api/admin/settings', async route => {
        if (route.request().method() !== 'POST') return route.fallback();
        const body = route.request().postDataJSON();
        expect(body.LAN_DISCOVERY_ENDPOINTS[0]).toEqual({
            url: 'https://books.home.arpa:8443/team/books', addresses: ['192.168.50.10'], interfaces: ['eth0'],
        });
        status = { ...status, enabled: body.LAN_DISCOVERY_ENABLED, endpoints: body.LAN_DISCOVERY_ENDPOINTS,
            status: { state: 'error', error: 'UDP 5353 test bind failure', instance_id: null } };
        await route.fulfill({ json: { err: 'ok' } });
    });
    await page.route('**/api/admin/upgrade', route => route.fulfill({ json: { err: 'ok', status: { phase: 'idle', disabled: 'loader', current: { version: 'mock-1.0.0', sequence: 1 } } } }));
    await page.goto('/admin/settings/general');
    const section = page.getByTestId('lan-discovery');
    await section.scrollIntoViewIfNeeded();
    await expect(section).toContainText('尚未配置端点');
    await expect(section).toContainText('未发布');
    await section.getByLabel('允许局域网发现此书库').focus();
    await page.keyboard.press('Space');
    await expect(section.getByLabel('允许局域网发现此书库')).toBeChecked();
    const addButton = section.getByRole('button', { name: '添加广播端点' });
    await addButton.focus();
    await expect(addButton).toBeFocused();
    await expect.poll(() => addButton.evaluate(el => Number(getComputedStyle(el, '::after').opacity))).toBeGreaterThan(0);
    await addButton.press('Enter');
    await section.getByLabel('外部地址（HTTP/HTTPS）').fill('https://books.home.arpa:8443/team/books');
    await section.getByLabel('外部监听 IP（逗号分隔）').fill('192.168.50.10');
    await section.getByLabel('发布网络接口').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('option', { name: 'eth0', exact: true }).press('Enter');
    await expect(section.locator('.v-chip')).toContainText('eth0');
    await page.keyboard.press('Escape');
    await page.locator('.settings-titlebar').getByRole('button', { name: '保存配置' }).click();
    await expect(section).toContainText('UDP 5353 test bind failure');
    await expect(section).toContainText('已保存的广播意图: 开启');
    await expect(section).toContainText('实际发布状态: 发布失败');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeHidden({ timeout: 10000 });
    const screenshotStyle = '.v-app-bar, .settings-titlebar, .route-tab-shell__nav, .upload-btn { opacity: 0 !important; transition: none !important; } .upload-btn, .upload-btn * { visibility: hidden !important; }';
    await section.screenshot({ path: '../document/screenshots/tb-445/discovery-desktop.png', style: screenshotStyle });
    status.overridden = ['LAN_DISCOVERY_ENABLED', 'LAN_DISCOVERY_ENDPOINTS'];
    await expect(section.getByLabel('允许局域网发现此书库')).toBeDisabled();
    await page.setViewportSize({ width: 320, height: 800 });
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole('button', { name: '添加广播端点' })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await section.screenshot({ path: '../document/screenshots/tb-445/discovery-mobile.png', style: screenshotStyle });
    await page.context().addCookies([{ name: 'theme', value: 'dark', url: 'http://127.0.0.1:18187' }]);
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/);
    await section.scrollIntoViewIfNeeded();
    await section.screenshot({ path: '../document/screenshots/tb-445/discovery-dark.png', style: screenshotStyle });
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
});
