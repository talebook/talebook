import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Plugin management', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('classifies plugins by canonical id and routes personal configuration correctly', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 1280, height: 900 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins');
        await catalogPromise;

        await expect(page.getByRole('tab', { name: '综合服务' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '元数据' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '划线笔记' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '评价' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '书源' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '书籍工具' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '推送设备' })).toBeVisible();
        await expect(page.getByText('Google Books / Amazon')).toBeVisible();
        await expect(page.getByText('Open Library')).toHaveCount(0);

        await page.getByRole('tab', { name: '综合服务' }).click();
        await expect(page.getByText('Open Library')).toBeVisible();
        await expect(page.getByText('Google Books / Amazon')).toHaveCount(0);
        const weread = page.locator('.plugin-card').filter({ hasText: '微信读书' });
        await weread.getByRole('button', { name: '详情' }).click();
        const wereadDetails = page.getByRole('dialog', { name: '微信读书' });
        await expect(wereadDetails.getByRole('heading', { name: '个人配置' })).toBeVisible();
        await expect(wereadDetails.getByText('公开配置（JSON）')).toHaveCount(0);
        await expect(wereadDetails.getByRole('button', { name: '创建连接' })).toHaveCount(0);
        await wereadDetails.getByRole('button', { name: '关闭' }).click();
        await weread.getByRole('button', { name: '打开工作台' }).click();
        await expect(page).toHaveURL(/\/plugins\/weread/);
        await expect(page.getByRole('heading', { name: '微信读书工作台' })).toBeVisible();

        await page.goto('/admin/plugins?tab=tools');
        await expect(page.getByText('TXT 编码修复')).toBeVisible();
        await page.goto('/admin/plugins?tab=push');
        const boox = page.locator('.plugin-card').filter({ hasText: 'BOOX' });
        await expect(boox).toHaveAttribute('data-status', 'enabled');
        await boox.getByRole('button', { name: '管理设备' }).click();
        await expect(page).toHaveURL(/\/user\/detail\?tab=devices/);
        await expect(page.getByRole('tab', { name: '阅读设备' })).toHaveAttribute('aria-selected', 'true');

        await page.goto('/admin/plugins?tab=book_sources');
        await expect(page.getByText('Generic OPDS')).toBeVisible();
        await expect(page.getByText('Legado 在线书源')).toBeVisible();
        await expect(page.getByText('Watch Folder')).toBeVisible();
        await expect(page.getByText('Calibre Content Server')).toHaveCount(0);
        await expect(page.getByText('Calibre-Web')).toHaveCount(0);
    });

    test('uses a green surface for enabled cards without removing the text status', async ({ page, request }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await expect(card).toHaveAttribute('data-status', 'enabled');
        await expect(card.getByText('正常')).toBeVisible();
        await expect(card.locator('.plugin-card__title-row').getByText('正常')).toBeVisible();
        const statusFontSize = await card.locator('.plugin-card__status').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        const titleFontSize = await card.locator('.plugin-card__title-row h3').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        expect(statusFontSize).toBeLessThan(titleFontSize);
        await expect(card.locator('.plugin-card__tags .v-chip')).not.toHaveCount(0);
        await expect(card.getByText('内置', { exact: true })).toHaveCount(0);
        expect(await card.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
        expect(await card.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none');

        const actionsBox = await card.locator('.plugin-card__actions').boundingBox();
        const descriptionBox = await card.locator('.plugin-description').boundingBox();
        expect(actionsBox.y).toBeLessThan(descriptionBox.y);
        const detailsBox = await card.locator('.plugin-card__footer').getByRole('button', { name: '详情' }).boundingBox();
        expect(detailsBox.y).toBeGreaterThan(descriptionBox.y);
        const summaryBox = await card.locator('.plugin-card__summary').boundingBox();
        expect(Math.abs((summaryBox.y + summaryBox.height / 2) - (detailsBox.y + detailsBox.height / 2))).toBeLessThanOrEqual(1);

        await card.getByRole('button', { name: '详情' }).click();
        await expect(page.locator('.plugin-details__actions').getByRole('button', { name: '停用' })).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();

        await request.post(`${mockApi}/api/admin/plugins/installations/1/state`, { data: { enabled: false } });
        await page.reload();
        await expect(card).toHaveAttribute('data-status', 'disabled');
        await expect(card.getByText('已停用')).toBeVisible();
        expect(await card.evaluate(element => getComputedStyle(element).backgroundImage)).toBe('none');
    });

    test('only offers device types from enabled push plugins', async ({ page, request }) => {
        await page.goto('/user/detail?tab=devices');
        const addButton = page.getByRole('button', { name: '添加' });
        await expect(addButton).toBeEnabled();
        await addButton.click();
        await page.getByRole('combobox', { name: '类型', exact: true }).focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('option', { name: 'BOOX' })).toBeVisible();
        await expect(page.getByRole('option', { name: '多看' })).toHaveCount(0);
        await page.keyboard.press('Escape');

        await request.post(`${mockApi}/api/admin/plugins/installations/8/state`, { data: { enabled: false } });
        await page.reload();
        await expect(addButton).toBeDisabled();
        await expect(page.getByText('暂无已启用的设备插件')).toBeVisible();
    });

    test('keeps the canonical tabs reachable on iPad portrait', async ({ page }) => {
        await page.setViewportSize({ width: 744, height: 1133 });
        await page.goto('/admin/plugins?tab=push');
        await expect(page.getByRole('tab', { name: '推送设备' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('.plugin-card').filter({ hasText: 'BOOX' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(744);
    });

    test('configures a source, previews candidates, and shows compliance columns', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Watch Folder' });
        await expect(card.getByText('待配置')).toBeVisible();
        await card.getByRole('button', { name: '配置' }).click();

        const dialog = page.getByRole('dialog');
        await dialog.getByRole('textbox', { name: '监听目录' }).fill('/data/books/imports');
        await dialog.getByRole('button', { name: '保存' }).click();
        await expect(dialog.getByRole('button', { name: '预览候选' })).toBeVisible();
        await dialog.getByRole('button', { name: '预览候选' }).click();

        await expect(page).toHaveURL(/\/admin\/plugins\/runs\/\d+/);
        await expect(page.getByRole('columnheader', { name: '格式' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: '来源' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: '访问条件' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: '许可 / 条件' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: '目标书库' })).toBeVisible();
        await expect(page.getByRole('cell', { name: 'EPUB' })).toBeVisible();
        await expect(page.getByRole('cell', { name: '可下载' })).toBeVisible();
        await expect(page.getByRole('cell', { name: '本地文件；许可由管理员确认' })).toBeVisible();
    });

    test('keeps the source connection form reachable at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Watch Folder' });
        await card.getByRole('button', { name: '配置' }).click();

        const dialog = page.getByRole('dialog');
        const save = dialog.getByRole('button', { name: '保存' });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox.width).toBeLessThanOrEqual(320);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });

    test('opens details, tests a connection, and exposes the shared run log', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        const detailsDialog = page.getByRole('dialog', { name: 'Generic OPDS' });
        await expect(detailsDialog).toBeVisible();
        await expect(detailsDialog.getByText('权限与数据范围')).toBeVisible();

        await page.getByRole('button', { name: '测试连接' }).click();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();
        await page.getByRole('link', { name: '执行记录' }).first().click();
        await expect(page.getByText('Generic OPDS · 内置连接')).toBeVisible();
        await expect(page.getByText('成功').first()).toBeVisible();
    });

    test('creates a no-secret connector connection, previews it, and keeps config explicit', async ({ page }) => {
        await page.goto('/admin/plugins?tab=integrations');
        const card = page.locator('.plugin-card').filter({ hasText: 'Open Library' });
        const configureButton = card.getByRole('button', { name: '配置' });
        await configureButton.click();

        let form = page.getByRole('dialog', { name: /配置 Open Library 连接/ });
        await form.getByRole('button', { name: '取消' }).click();
        await expect(configureButton).toBeFocused();
        await configureButton.click();

        form = page.getByRole('dialog', { name: /配置 Open Library 连接/ });
        const configInput = form.getByRole('textbox', { name: '公开配置（JSON）' });
        await expect(configInput).toBeVisible();
        await configInput.fill('[');
        await form.getByRole('button', { name: '保存' }).click();
        await expect(form.getByText('公开配置必须是有效的 JSON 对象。')).toBeVisible();
        await expect(configInput).toHaveAttribute('aria-invalid', 'true');
        await expect(configInput).toBeFocused();

        await configInput.fill(JSON.stringify({
            queries: [{ book_id: 1, isbn: '9781234567897', current_metadata: {}, locked_fields: [] }],
        }));
        await form.getByRole('button', { name: '保存' }).click();

        await expect(page.getByText('default · 尚未测试')).toBeVisible();
        await page.getByRole('button', { name: '预览' }).click();
        await expect(page.getByText(/上次执行：成功/)).toBeVisible();
    });

    test('moves the Talebook OPDS service setting from Settings into the OPDS plugin', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/admin/settings');
        await expect(page.getByRole('heading', { name: 'OPDS 设置' })).toHaveCount(0);

        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();

        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('heading', { name: 'Talebook OPDS 服务' })).toBeVisible();
        const serviceSwitch = dialog.getByLabel('启用 OPDS 服务');
        await expect(serviceSwitch).toBeChecked();
        await serviceSwitch.focus();
        await page.keyboard.press('Space');
        await expect(serviceSwitch).not.toBeChecked();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });

    test('old book source URL redirects into the plugin source tab', async ({ page }) => {
        await page.goto('/admin/booksources');
        await expect(page).toHaveURL(/\/admin\/plugins\?.*tab=book_sources/);
        await expect(page.getByText('Legado 书源管理')).toBeVisible();
        await expect(page.getByText('测试书源')).toBeVisible();
    });

    test('keeps filters in the URL and reflows the details panel on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins?tab=book_sources');
        await catalogPromise;
        const description = page.getByText('连接外部服务，补全书籍信息、导入笔记与评价，或添加书源。');
        await expect(description).toBeVisible();
        expect(await description.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const search = page.getByRole('textbox', { name: '搜索名称、说明或能力' });
        await search.fill('OPDS');
        await expect(page).toHaveURL(/q=OPDS/);
        await expect(page.getByText('Generic OPDS')).toBeVisible();

        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox.width).toBeLessThanOrEqual(375);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth).toBeLessThanOrEqual(375);
    });

    test('keeps focus contained in details and restores it after Escape', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        const card = page.locator('.plugin-card').filter({ hasText: 'Generic OPDS' });
        const details = card.getByRole('button', { name: '详情' });
        await details.focus();
        await page.keyboard.press('Enter');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await page.keyboard.press('Tab');
        expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(details).toBeFocused();
    });

    test('requires confirmation before a text tool overwrites the original book', async ({ page }) => {
        await page.goto('/plugins/text-replace');
        const bookSelect = page.getByRole('combobox', { name: '选择书籍' });
        await bookSelect.click();
        await page.getByRole('option', { name: /测试书/ }).click();
        await page.getByRole('textbox', { name: '查找内容' }).fill('测试');
        await page.getByRole('radio', { name: '写回原书' }).check();

        const confirmation = page.waitForEvent('dialog');
        const overwrite = page.getByRole('button', { name: '写回原书' }).click();
        const dialog = await confirmation;
        expect(dialog.message()).toContain('《测试书》');
        await dialog.dismiss();
        await overwrite;
    });
});
