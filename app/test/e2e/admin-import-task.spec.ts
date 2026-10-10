import { test, expect } from '@playwright/test';

test('stop task by keyboard, retain results, and allow retry at narrow width', async ({ page, request }) => {
    await request.post(`${process.env.MOCK_API_URL || 'http://127.0.0.1:8080'}/_test/reset`, { data: { installed: true } });
    let task = { active: true, kind: 'scan', cancelled: false, processed: 12, failed: 1 };
    let failCancel = true;
    await page.route('**/api/admin/import/task', async route => {
        if (route.request().method() === 'DELETE') {
            if (failCancel) return route.fulfill({ json: { err: 'error', msg: '停止失败，请重试' } });
            task = { ...task, cancelled: true };
        }
        return route.fulfill({ json: { err: 'ok', task } });
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    page.on('pageerror', error => console.error(error.message));
    await page.goto('/admin/imports');
    await expect(page.locator('.loading-page')).toBeHidden({ timeout: 45000 });
    const stop = page.getByRole('button', { name: '停止当前任务' });
    await expect(stop).toBeVisible();
    await expect(page.getByText('已处理 12 项，失败 1 项')).toBeVisible();
    await stop.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('停止失败，请重试')).toBeVisible();
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(stop).toBeEnabled();
    failCancel = false;
    await stop.focus();
    await page.keyboard.press('Space');
    await expect(page.getByText('正在停止，当前书籍处理完成后结束。')).toBeVisible();
    await expect(stop).toBeDisabled();
    await page.screenshot({ path: 'test-results/scan-stopping-desktop.png', fullPage: true });
    task = { ...task, active: false };
    await expect(stop).toBeHidden();
    await expect(page.getByText(/任务已停止，已完成结果保留/)).toBeVisible();
    await page.setViewportSize({ width: 320, height: 760 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('banner').getByRole('button').nth(2).click();
    await expect(page.locator('.v-application')).toHaveClass(/v-theme--dark/);
    // Let the existing theme transition settle before capturing colors.
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: '扫描书籍' })).toBeEnabled();
    const region = page.getByRole('status').filter({ hasText: '任务已停止' });
    const bounds = await region.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(320);
    await page.screenshot({ path: 'test-results/scan-stopped-mobile.png', fullPage: true });
    await page.route('**/api/admin/scan/run', async route => {
        task = { active: true, kind: 'scan', cancelled: false, processed: 0, failed: 0 };
        await route.fulfill({ json: { err: 'ok' } });
    });
    await page.getByRole('button', { name: '扫描书籍' }).click();
    await expect(page.getByText('已处理 0 项，失败 0 项')).toBeVisible();
    await expect(stop).toBeEnabled();
    task = { ...task, active: false, processed: 3 };
    await expect(page.getByText('任务已完成，已处理 3 项，失败 0 项；请查看下方扫描记录。')).toBeVisible();
    await expect(stop).toBeHidden();
});
