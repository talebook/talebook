import { test, expect } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

test.describe('Plugin management', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('shows five business tabs and opens the WeRead integration workbench', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins');
        await catalogPromise;

        await expect(page.getByRole('tab', { name: '综合服务' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '元数据' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '划线笔记' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '评价' })).toBeVisible();
        await expect(page.getByRole('tab', { name: '书源' })).toBeVisible();
        await page.getByRole('tab', { name: '元数据' }).click();
        await expect(page.getByText('Talebook 元数据')).toHaveCount(0);
        await expect(page.getByText('七猫小说', { exact: true })).toBeVisible();
        await expect(page.getByText('Google Books', { exact: true })).toBeVisible();
        await expect(page.getByText('Amazon', { exact: true })).toBeVisible();
        await expect(page.getByText('嵌入文件元数据')).toHaveCount(0);
        await expect(page.getByText('Calibre Provider Bridge')).toHaveCount(0);

        const metadataCard = page.locator('.plugin-card').filter({ hasText: 'Google Books' });
        await expect(metadataCard.locator('.plugin-card-title')).toContainText('正常');
        await expect(metadataCard.getByText('元数据', { exact: true })).toBeVisible();
        await expect(metadataCard.getByRole('button', { name: '测试', exact: true })).toBeVisible();

        await page.getByRole('tab', { name: '综合服务' }).click();
        const weread = page.locator('.plugin-card').filter({ hasText: '微信读书' });
        await expect(weread).toBeVisible();
        await weread.getByRole('button', { name: '打开工作台' }).click();
        await expect(page).toHaveURL(/\/plugins\/weread/);
        await expect(page.getByRole('heading', { name: '微信读书工作台' })).toBeVisible();

        await page.goto('/admin/plugins?tab=book_sources');
        await page.getByRole('tab', { name: '书源' }).click();
        await expect(page.getByText('Generic OPDS')).toBeVisible();
        await expect(page.getByText('Legado 在线书源')).toBeVisible();
        await expect(page.getByText('Watch Folder')).toBeVisible();
        await expect(page.getByText('Calibre Content Server')).toHaveCount(0);
        await expect(page.getByText('Calibre-Web')).toHaveCount(0);
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
        await expect(page.getByText('权限与数据范围')).toBeVisible();

        await page.getByRole('button', { name: '测试连接' }).click();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();
        await page.getByRole('link', { name: '执行记录' }).first().click();
        await expect(page.getByText('Generic OPDS · 内置连接')).toBeVisible();
        await expect(page.getByText('成功').first()).toBeVisible();
    });

    test('tests Open Library without configuration and keeps optional ISBN fields in details', async ({ page }) => {
        await page.goto('/admin/plugins?tab=metadata');
        const card = page.locator('.plugin-card').filter({ hasText: 'Open Library' });
        const testButton = card.getByRole('button', { name: '测试', exact: true });
        await testButton.click();
        await expect(card.getByText(/上次执行：成功/)).toBeVisible();

        await card.getByRole('button', { name: '详情' }).click();
        await page.getByRole('button', { name: '编辑连接' }).click();

        const form = page.getByRole('dialog', { name: /配置 Open Library 连接/ });
        await expect(form.getByText('无需寻找或粘贴 Open Library JSON')).toBeVisible();
        await expect(form.getByRole('textbox', { name: '公开配置（JSON）' })).toHaveCount(0);
        const isbnInput = form.getByRole('combobox', { name: '要查询的 ISBN' });
        await isbnInput.fill('9781234567897');
        await isbnInput.press('Enter');
        await form.getByRole('button', { name: '保存' }).click();

        await expect(page.getByText('default · 连接正常')).toBeVisible();
        await page.getByRole('button', { name: '预览' }).click();
        await expect(page.getByText(/上次执行：成功/)).toBeVisible();
    });

    test('keeps plugin card actions at the upper right on iPad mini portrait', async ({ page }) => {
        await page.setViewportSize({ width: 744, height: 1133 });
        await page.goto('/admin/plugins?tab=metadata');
        const card = page.locator('.plugin-card').filter({ hasText: 'Open Library' });
        const titleBox = await card.getByText('Open Library', { exact: true }).boundingBox();
        const actionBox = await card.getByRole('button', { name: '测试', exact: true }).boundingBox();
        const cardBox = await card.boundingBox();
        expect(actionBox.y).toBeLessThan(titleBox.y + 36);
        expect(actionBox.x + actionBox.width).toBeGreaterThan(cardBox.x + cardBox.width - 100);
    });

    test('shows each metadata source as a plugin and searches from its test dialog', async ({ page }) => {
        await page.goto('/admin/plugins?tab=metadata');
        await expect(page.getByRole('heading', { name: '插件' })).toBeVisible({ timeout: 20000 });
        const qimao = page.locator('.plugin-card').filter({ has: page.getByText('七猫小说', { exact: true }) });
        await expect(qimao).toBeVisible();
        await expect(qimao.getByRole('button', { name: '启用' })).toBeVisible();
        await qimao.getByRole('button', { name: '启用' }).click();
        await qimao.getByRole('button', { name: '测试', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: /测试 七猫小说/ });
        await dialog.getByRole('textbox', { name: '搜索关键字' }).fill('西游记');
        await dialog.getByRole('button', { name: '搜索', exact: true }).click();
        await expect(dialog.getByText('西游记', { exact: true })).toBeVisible();
        await expect(dialog.locator('.v-list-item')).toHaveCount(5);
    });

    test('keeps icon, title, status and actions on one row on a phone', async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/admin/plugins?tab=metadata');
        const card = page.locator('.plugin-card').filter({ hasText: 'Google Books' });
        const avatar = await card.locator('.plugin-card-avatar').boundingBox();
        const title = await card.getByText('Google Books', { exact: true }).boundingBox();
        const status = await card.getByText('正常', { exact: true }).boundingBox();
        const action = await card.getByRole('button', { name: '测试', exact: true }).boundingBox();
        const boxes = [avatar, title, status, action];
        expect(Math.max(...boxes.map(box => box.y))).toBeLessThan(
            Math.min(...boxes.map(box => box.y + box.height)),
        );
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });

    test('uses readable forms for BRS and review connectors', async ({ page }) => {
        await page.goto('/admin/plugins?tab=annotations');
        const brs = page.locator('.plugin-card').filter({ hasText: 'talebook-brs 章评' });
        await brs.getByRole('button', { name: '配置' }).click();
        let dialog = page.getByRole('dialog', { name: /配置 talebook-brs 章评\s+连接/ });
        await expect(dialog.getByText('交互与 candle-reader 一致')).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: '邮箱' })).toBeVisible();
        await expect(dialog.getByLabel('密码')).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: '昵称（快速注册时填写）' })).toHaveCount(0);
        await expect(dialog.getByRole('textbox', { name: 'BRS 服务地址' })).toBeVisible();
        const accountMode = dialog.getByRole('combobox', { name: '账号方式' });
        await expect(accountMode).toHaveValue('登录已有账号');
        await accountMode.focus();
        await accountMode.press('ArrowDown');
        await page.getByRole('option', { name: '快速注册' }).click();
        await expect(dialog.getByRole('textbox', { name: '昵称（快速注册时填写）' })).toBeVisible();
        await expect(dialog.getByLabel('密码')).toHaveCount(0);
        await expect(dialog.getByRole('textbox', { name: '书籍映射' })).toBeVisible();
        await expect(dialog.getByText('每行一组映射，例如 remote-book=42')).toBeVisible();
        await dialog.getByRole('button', { name: '取消' }).click();

        await page.goto('/admin/plugins?tab=reviews');
        const neodb = page.locator('.plugin-card').filter({ hasText: 'NeoDB 评价' });
        await neodb.getByRole('button', { name: '配置' }).click();
        dialog = page.getByRole('dialog', { name: /配置 NeoDB 评价\s+连接/ });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('textbox', { name: '公开配置（JSON）' })).toHaveCount(0);
        await expect(dialog.getByRole('combobox', { name: '要查询的书籍标识' })).toBeVisible();
    });

    test('offers public free book sources as first-class cards', async ({ page }) => {
        await page.goto('/admin/plugins?tab=book_sources');
        for (const name of ['Project Gutenberg', 'Internet Archive']) {
            const card = page.locator('.plugin-card').filter({ hasText: name });
            await expect(card).toBeVisible();
            await expect(card.getByText('免费公开')).toBeVisible();
            await expect(card.getByRole('button', { name: '测试', exact: true })).toBeVisible();
        }
        await expect(page.locator('.plugin-card').filter({ hasText: 'Standard Ebooks' }).getByText('免费公开')).toHaveCount(0);
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
        await page.goto('/admin/plugins?tab=book_sources');
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
});
