import { test, expect, type Locator } from '@playwright/test';

const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

const renderedContrast = (locator: Locator) => locator.evaluate((element) => {
    type Color = { red: number; green: number; blue: number; alpha: number };
    const parse = (value: string): Color => {
        const channels = value.match(/[\d.]+/g)?.map(Number) || [];
        return {
            red: channels[0] || 0,
            green: channels[1] || 0,
            blue: channels[2] || 0,
            alpha: channels[3] ?? 1,
        };
    };
    const composite = (foreground: Color, background: Color): Color => {
        const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
        const channel = (foregroundValue: number, backgroundValue: number) => (
            (foregroundValue * foreground.alpha + backgroundValue * background.alpha * (1 - foreground.alpha)) / alpha
        );
        return {
            red: channel(foreground.red, background.red),
            green: channel(foreground.green, background.green),
            blue: channel(foreground.blue, background.blue),
            alpha,
        };
    };
    const luminance = (color: Color) => {
        const channels = [color.red, color.green, color.blue].map(channel => {
            const normalized = channel / 255;
            return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };
    const ancestors: Element[] = [];
    for (let current: Element | null = element; current; current = current.parentElement) ancestors.push(current);
    let background: Color = { red: 255, green: 255, blue: 255, alpha: 1 };
    for (const current of ancestors.reverse()) {
        background = composite(parse(getComputedStyle(current).backgroundColor), background);
    }
    const foreground = luminance(composite(parse(getComputedStyle(element).color), background));
    const backgroundLuminance = luminance(background);
    return (Math.max(foreground, backgroundLuminance) + 0.05) / (Math.min(foreground, backgroundLuminance) + 0.05);
});

test.describe('Plugin management', () => {
    test.beforeEach(async ({ request }) => {
        await request.post(`${mockApi}/_test/reset`, { data: { installed: true } });
    });

    test('separates instance management from the current accounts personal configuration', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 1280, height: 900 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins');
        await catalogPromise;

        await expect(page.getByRole('tab', { name: '个人配置' })).toHaveCount(0);
        await expect(page.getByText('内置插件无需安装')).toBeVisible();
        await expect(page.getByRole('button', { name: '安装' })).toHaveCount(0);
        await expect(page.getByRole('tab', { name: '插件中心' })).toHaveAttribute('aria-selected', 'true');
        expect(await page.locator('.plugin-page').evaluate(element => element.tagName)).toBe('SECTION');
        await expect(page.getByText('Calibre 元数据')).toBeVisible();
        await expect(page.getByText('Open Library', { exact: true })).toBeVisible();
        await expect(page.getByText('AI 元数据')).toHaveCount(0);
        const calibreIcon = page.locator('.management-row').filter({ hasText: 'Calibre 元数据' }).locator('.plugin-brand-icon');
        await expect(calibreIcon.locator('img[src="/images/plugin-icons/calibre.svg"]')).toBeVisible();
        const lightOutline = await calibreIcon.evaluate(element => getComputedStyle(element, '::after').boxShadow);
        expect(lightOutline).not.toBe('none');
        const themeRoot = page.locator('.v-theme--light').first();
        await themeRoot.evaluate(element => element.classList.replace('v-theme--light', 'v-theme--dark'));
        const darkOutline = await calibreIcon.evaluate(element => getComputedStyle(element, '::after').boxShadow);
        expect(darkOutline).not.toBe(lightOutline);
        await themeRoot.evaluate(element => element.classList.replace('v-theme--dark', 'v-theme--light'));
        await expect(page.locator('.management-row').filter({ hasText: 'Open Library' }).locator('img[src="/images/plugin-icons/open-library.png"]')).toBeVisible();
        const kindleRow = page.locator('.management-row').filter({ hasText: 'Kindle 邮箱推送' });
        await kindleRow.scrollIntoViewIfNeeded();
        await expect(kindleRow.locator('img[src="/images/plugin-icons/kindle.png"]')).toBeVisible();
        await expect(page.getByRole('heading', { name: '综合服务' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '元数据' })).toBeVisible();
        await expect(page.getByRole('heading', { name: '书源' })).toBeVisible();
        const displayedGroups = page.locator('.management-group');
        const categoryDescriptions = page.locator('.management-group__description');
        expect(await categoryDescriptions.count()).toBe(await displayedGroups.count());
        expect(await displayedGroups.count()).toBeGreaterThan(0);
        const metadataGroup = page.locator('#plugin-group-meta');
        const metadataDescription = metadataGroup.locator('.management-group__description');
        await expect(metadataDescription).toContainText('元数据插件提供书籍信息的搜索功能');
        await expect(metadataDescription).toContainText('从互联网同步书籍信息');
        await expect(metadataDescription).toContainText('自动补全设置');
        const metadataTitleBox = await metadataGroup.getByRole('heading', { name: '元数据' }).boundingBox();
        const metadataDescriptionBox = await metadataDescription.boundingBox();
        expect(metadataDescriptionBox.y).toBeGreaterThan(metadataTitleBox.y);
        await expect(page.getByText('Project Gutenberg', { exact: true })).toBeVisible();
        await expect(page.getByText('Standard Ebooks · 最新上架', { exact: true })).toBeVisible();
        const categoryNavigation = page.getByRole('navigation', { name: '插件分类' });
        await expect(categoryNavigation).toBeVisible();
        await expect(categoryNavigation.getByRole('button', { name: /元数据/ })).toBeVisible();
        expect(await categoryNavigation.evaluate(element => getComputedStyle(element).position)).toBe('sticky');
        const contentBox = await page.locator('.management-content').boundingBox();
        const navigationBox = await categoryNavigation.boundingBox();
        expect(navigationBox.x).toBeGreaterThan(contentBox.x);
        const stickyTop = await categoryNavigation.evaluate(element => Number.parseFloat(getComputedStyle(element).top));
        await page.evaluate(() => window.scrollTo(0, 700));
        await expect.poll(async () => Math.round((await categoryNavigation.boundingBox()).y)).toBe(Math.round(stickyTop));
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.evaluate(() => {
            const nativeScrollIntoView = Element.prototype.scrollIntoView;
            (window as typeof window & { pluginScrollBehavior?: ScrollBehavior }).pluginScrollBehavior = undefined;
            Element.prototype.scrollIntoView = function scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
                if (typeof options === 'object') {
                    (window as typeof window & { pluginScrollBehavior?: ScrollBehavior }).pluginScrollBehavior = options.behavior;
                }
                return nativeScrollIntoView.call(this, options);
            };
        });
        await categoryNavigation.getByRole('button', { name: /书源/ }).click();
        const sourceNavigation = categoryNavigation.getByRole('button', { name: /书源/ });
        await expect(sourceNavigation).toHaveClass(/active/);
        await expect(sourceNavigation).toHaveAttribute('aria-current', 'location');
        expect(await page.evaluate(() => (
            window as typeof window & { pluginScrollBehavior?: ScrollBehavior }
        ).pluginScrollBehavior)).toBe('auto');
        const sourceGroup = page.locator('#plugin-group-source');
        await expect.poll(async () => Math.round((await sourceGroup.boundingBox()).y)).toBe(Math.round(stickyTop));

        await page.goto('/me/plugins');
        await expect(page.getByRole('tab', { name: '个人插件设置' })).toHaveAttribute('aria-selected', 'true');
        await page.context().addCookies([{ name: 'theme', value: 'dark', url: new URL(page.url()).origin }]);
        await page.reload();
        expect(await page.locator('.personal-status').first().evaluate(element => getComputedStyle(element).color))
            .toBe('rgba(255, 255, 255, 0.78)');
        const boox = page.locator('.personal-row').filter({ hasText: 'BOOX' });
        await boox.getByRole('button', { name: '个人设置' }).click();
        await expect(page).toHaveURL('/me/devices');

        await page.goto('/me/plugins');
        const weread = page.locator('.personal-row').filter({ hasText: '微信读书' });
        await expect(weread.locator('img[src="/images/plugin-icons/weread.png"]')).toBeVisible();
        await weread.getByRole('button', { name: '个人设置' }).click();
        await expect(page).toHaveURL(/\/plugins\/weread/);
        await expect(page.getByRole('heading', { name: '微信读书工作台' })).toBeVisible();

        await page.goto('/admin/plugins?tab=sources');
        await expect(page.getByText('Generic OPDS')).toBeVisible();
        await expect(page.getByText('Legado 在线书源')).toBeVisible();
        await expect(page.getByText('在线书源元数据')).toHaveCount(0);
        await expect(page.getByText('Watch Folder')).toBeVisible();
        await expect(page.getByText('Calibre Content Server')).toHaveCount(0);
        await expect(page.getByText('Calibre-Web')).toHaveCount(0);

        const legado = page.locator('.management-row').filter({ hasText: 'Legado 在线书源' });
        await legado.getByRole('button', { name: '详情' }).click();
        const legadoDetails = page.getByRole('dialog', { name: 'Legado 在线书源' });
        await expect(legadoDetails.getByRole('tab', { name: '检索元数据' })).toBeVisible();
        await expect(legadoDetails.getByRole('tab', { name: '搜索书源' })).toBeVisible();
        await legadoDetails.getByRole('button', { name: '关闭' }).click();
        await legado.getByRole('button', { name: '全局配置' }).click();
        await expect(page).toHaveURL(/\/plugins\/legado/);
        await expect(page.getByRole('heading', { name: 'Legado 书源工作台' })).toBeVisible();
    });

    test('uses the compact A-style list and keeps disable inside details', async ({ page, request }) => {
        await page.goto('/admin/plugins?tab=sources');
        const row = page.locator('.management-row').filter({ hasText: 'Generic OPDS' });
        await expect(row.getByText('正常')).toBeVisible();
        const statusFontSize = await row.locator('.management-status').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        const titleFontSize = await row.locator('.management-row__title strong').evaluate(element => parseFloat(getComputedStyle(element).fontSize));
        expect(statusFontSize).toBeGreaterThanOrEqual(12);
        expect(statusFontSize).toBeLessThan(titleFontSize);
        const rowHeight = await row.evaluate(element => element.getBoundingClientRect().height);
        expect(rowHeight).toBeLessThanOrEqual(76);
        expect(await row.evaluate(element => getComputedStyle(element).boxShadow)).toBe('none');
        await expect(row.getByText('管理员配置')).toHaveCount(0);
        await expect(row.getByText('尚未测试')).toHaveCount(0);
        await expect(row.getByRole('button', { name: '停用' })).toHaveCount(0);
        await page.context().addCookies([{ name: 'theme', value: 'dark', url: new URL(page.url()).origin }]);
        await page.reload();
        await expect(row.getByText('正常')).toBeVisible();
        expect(await row.locator('.management-status').evaluate(element => getComputedStyle(element).color))
            .toBe('rgba(255, 255, 255, 0.78)');
        await row.getByRole('button', { name: '详情' }).click();
        await expect(page.locator('.plugin-details__actions').getByRole('button', { name: '停用' })).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: '关闭' }).click();

        await request.post(`${mockApi}/api/admin/plugins/installations/1/state`, { data: { enabled: false } });
        await page.reload();
        await expect(row.getByText('未启用')).toBeVisible();
        await expect(row.getByRole('button', { name: '启用' })).toBeVisible();
    });

    test('logs into BRS directly and saves the verified personal connection', async ({ page }) => {
        let remoteForm = '';
        await page.route('https://brs.example/api/user/sign_in', async (route) => {
            remoteForm = route.request().postData() || '';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                headers: {
                    'Access-Control-Allow-Origin': new URL(page.url()).origin,
                    'Access-Control-Allow-Credentials': 'true',
                },
                body: JSON.stringify({ err: 'ok', data: { id: 7 } }),
            });
        });
        await page.goto('/me/plugins');
        const brs = page.locator('.personal-row').filter({ hasText: 'talebook-brs 章评服务器' });
        await brs.getByRole('button', { name: '个人设置' }).click();
        await expect(page).toHaveURL(/\/plugins\/brs/);
        expect(await page.locator('.brs-page').evaluate(element => element.tagName)).toBe('SECTION');

        const endpoint = page.getByRole('textbox', { name: 'BRS 服务器地址' });
        await expect(endpoint).toHaveValue('https://brs.talebook.org');
        await endpoint.fill('https://brs.example');
        await page.getByRole('textbox', { name: '邮箱' }).fill('reader@example.com');
        await page.getByLabel('密码').fill('private-password');
        await page.getByRole('button', { name: '登录并连接' }).click();

        await expect(page.getByText('登录成功，个人 BRS 连接已保存。')).toBeVisible();
        expect(remoteForm).toContain('email=reader%40example.com');
        expect(remoteForm).toContain('password=private-password');
        await expect(page.getByText('已连接')).toBeVisible();
    });

    test('does not expose connection or JSON configuration for no-setup metadata plugins', async ({ page }) => {
        await page.goto('/admin/plugins?tab=metadata');
        const card = page.locator('.management-row').filter({ hasText: 'Calibre 元数据' });
        await expect(card.getByRole('button', { name: '配置' })).toHaveCount(0);
        await card.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog', { name: 'Calibre 元数据' });
        await expect(dialog.getByText('设置', { exact: true })).toHaveCount(0);
        await expect(dialog.getByText('连接名称')).toHaveCount(0);
        await expect(dialog.getByText('公开配置（JSON）')).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: '测试连接' })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: '预览', exact: true })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: '立即执行' })).toHaveCount(0);
        await dialog.getByRole('textbox', { name: '书名' }).fill('活着');
        await dialog.getByRole('button', { name: '检索元数据' }).click();
        await expect(dialog.getByRole('status')).toHaveText('返回 1 条结果');
        await expect(dialog.getByText('活着', { exact: true })).toBeVisible();
        await expect(dialog.getByText(/余华.*作家出版社.*9787506365437/)).toBeVisible();
    });

    test('moves metadata behavior and global devices from settings into plugin management', async ({ page }) => {
        await page.goto('/admin/settings');
        await expect(page.getByRole('heading', { name: '互联网书籍信息源' })).toHaveCount(0);
        await expect(page.getByRole('heading', { name: '全局设备管理' })).toHaveCount(0);

        await page.goto('/admin/plugins');
        await page.getByRole('button', { name: '自动补全设置' }).click();
        await expect(page.getByRole('dialog').getByLabel('自动从互联网拉取新书的书籍信息')).toBeVisible();
        await page.getByRole('dialog').getByRole('button', { name: '取消' }).click();

        await page.getByRole('button', { name: '全局设备' }).click();
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: '添加全局设备' }).click();
        await expect(dialog.getByRole('combobox', { name: '类型' })).toHaveValue('BOOX');
    });

    test('only offers device types from enabled push plugins', async ({ page, request }) => {
        await page.goto('/user/detail?tab=devices');
        await expect(page).toHaveURL('/me/devices');
        const addButton = page.getByRole('button', { name: '添加' });
        await expect(addButton).toBeEnabled();
        await addButton.click();
        await page.getByRole('combobox', { name: '类型', exact: true }).focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('option', { name: 'BOOX' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'Kindle 邮箱推送' })).toBeVisible();
        await expect(page.getByRole('option', { name: '多看' })).toHaveCount(0);
        await page.keyboard.press('Escape');

        const catalog = await (await request.get(`${mockApi}/api/admin/plugins`)).json();
        const boox = catalog.installations.find(item => item.plugin_key === 'talebook.push.boox');
        await request.post(`${mockApi}/api/admin/plugins/installations/${boox.id}/state`, { data: { enabled: false } });
        await page.reload();
        await expect(addButton).toBeEnabled();
        await addButton.click();
        await page.getByRole('combobox', { name: '类型', exact: true }).last().focus();
        await page.keyboard.press('ArrowDown');
        await expect(page.getByRole('option', { name: 'Kindle 邮箱推送' })).toBeVisible();
        await expect(page.getByRole('option', { name: 'BOOX' })).toHaveCount(0);
        await page.keyboard.press('Escape');

        const kindle = catalog.installations.find(item => item.plugin_key === 'talebook.push.kindle');
        await request.post(`${mockApi}/api/admin/plugins/installations/${kindle.id}/state`, { data: { enabled: false } });
        await page.reload();
        await expect(addButton).toBeDisabled();
        await expect(page.getByText('暂无已启用的设备插件')).toBeVisible();
    });

    test('keeps both control planes and category help reachable on narrow screens', async ({ page }) => {
        await page.setViewportSize({ width: 744, height: 1133 });
        await page.goto('/admin/plugins?tab=push');
        await expect(page.getByRole('tab', { name: '个人配置' })).toHaveCount(0);
        await expect(page.locator('.management-row').filter({ hasText: 'BOOX' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(744);

        await page.goto('/me/plugins');
        await expect(page.getByRole('tab', { name: '个人插件设置' })).toHaveAttribute('aria-selected', 'true');
        await expect(page.locator('.personal-row').filter({ hasText: '微信读书' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(744);

        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto('/admin/plugins?tab=metadata');
        const metadataGroup = page.locator('#plugin-group-meta');
        await expect(metadataGroup.locator('.management-group__description')).toBeVisible();
        await expect(metadataGroup.getByRole('button', { name: '自动补全设置' })).toBeVisible();
        expect(await metadataGroup.locator('.management-group__heading').evaluate(element => (
            getComputedStyle(element).flexDirection
        ))).toBe('column');
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    });

    test('configures a source without inventing undeclared generic actions', async ({ page }) => {
        await page.goto('/admin/plugins?tab=sources');
        const card = page.locator('.management-row').filter({ hasText: 'Watch Folder' });
        await expect(card.getByText('待配置')).toBeVisible();
        await card.getByRole('button', { name: '全局配置' }).click();

        const dialog = page.getByRole('dialog');
        await dialog.getByRole('textbox', { name: '监听目录' }).fill('/data/books/imports');
        await dialog.getByRole('button', { name: '保存' }).click();
        await expect(dialog.getByRole('button', { name: '预览候选' })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: '测试连接' })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: '立即执行' })).toHaveCount(0);
        await expect(dialog.getByRole('heading', { name: '能力测试' })).toHaveCount(0);
    });

    test('keeps the source connection form reachable at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/admin/plugins?tab=sources');
        const card = page.locator('.management-row').filter({ hasText: 'Watch Folder' });
        await card.getByRole('button', { name: '全局配置' }).click();

        const dialog = page.getByRole('dialog');
        const save = dialog.getByRole('button', { name: '保存' });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox.width).toBeLessThanOrEqual(320);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    });

    test('removes generic actions from details and uses the source protocol', async ({ page }) => {
        await page.goto('/admin/plugins?tab=sources');
        const card = page.locator('.management-row').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        const detailsDialog = page.getByRole('dialog', { name: 'Generic OPDS' });
        await expect(detailsDialog).toBeVisible();
        const permissions = detailsDialog.getByRole('button', { name: '权限与数据范围' });
        await expect(permissions).toHaveAttribute('aria-expanded', 'false');
        expect(await detailsDialog.locator('.plugin-permissions .v-expansion-panel').evaluate(element => getComputedStyle(element).boxShadow)).toBe('none');
        await expect(detailsDialog.getByText('books.read', { exact: true })).not.toBeVisible();
        await permissions.click();
        await expect(permissions).toHaveAttribute('aria-expanded', 'true');
        await expect(detailsDialog.getByText('books.read', { exact: true })).toBeVisible();

        await expect(detailsDialog.getByRole('button', { name: '测试连接' })).toHaveCount(0);
        await expect(detailsDialog.getByRole('button', { name: '预览', exact: true })).toHaveCount(0);
        await expect(detailsDialog.getByRole('button', { name: '立即执行' })).toHaveCount(0);
        await detailsDialog.getByRole('textbox', { name: '搜索关键词' }).fill('Pride');
        await detailsDialog.getByRole('button', { name: '搜索书源' }).click();
        await expect(detailsDialog.getByText('Pride and Prejudice', { exact: true })).toBeVisible();
    });

    test('does not expose the platform connection model for no-setup plugins', async ({ page }) => {
        await page.goto('/admin/plugins?tab=integrations');
        const card = page.locator('.management-row').filter({
            has: page.getByText('Open Library', { exact: true }),
        });
        await expect(card.getByRole('button', { name: '配置' })).toHaveCount(0);
        await card.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog', { name: 'Open Library' });
        await expect(dialog.getByText('连接名称')).toHaveCount(0);
        await expect(dialog.getByText('公开配置（JSON）')).toHaveCount(0);
        await expect(dialog.getByRole('tab', { name: '检索元数据' })).toBeVisible();
        await dialog.getByRole('tab', { name: '查询评价' }).click();
        await dialog.getByRole('textbox', { name: 'ISBN' }).fill('9787506365437');
        await dialog.getByRole('button', { name: '查询评价' }).click();
        await expect(dialog.getByText('Google Books', { exact: true })).toBeVisible();
        await expect(dialog.getByText(/评分 4.5 \/ 5/)).toBeVisible();
    });

    test('offers verified public catalogs as one-click experiences', async ({ page }) => {
        await page.goto('/admin/plugins?tab=sources');
        const standardEbooks = page.locator('.management-row').filter({ hasText: 'Standard Ebooks' });
        await expect(standardEbooks.getByRole('button', { name: '配置' })).toHaveCount(0);
        await standardEbooks.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog', { name: 'Standard Ebooks' });
        await expect(dialog.getByText('这是无需账号的公开免费书目')).toBeVisible();
        await dialog.getByRole('button', { name: '关闭' }).click();

        const gutenberg = page.locator('.management-row').filter({ hasText: 'Project Gutenberg' });
        await gutenberg.getByRole('button', { name: '体验' }).click();
        const gutenbergDetails = page.getByRole('dialog', { name: 'Project Gutenberg' });
        await gutenbergDetails.getByRole('textbox', { name: '搜索关键词' }).fill('Pride');
        await gutenbergDetails.getByRole('button', { name: '搜索书源' }).click();
        await expect(gutenbergDetails.getByText('Pride and Prejudice', { exact: true })).toBeVisible();
    });

    test('moves the Talebook OPDS service setting from Settings into the OPDS plugin', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 640 });
        await page.goto('/admin/settings');
        await expect(page.getByRole('heading', { name: 'OPDS 设置' })).toHaveCount(0);

        await page.goto('/admin/plugins?tab=sources');
        const card = page.locator('.management-row').filter({ hasText: 'Generic OPDS' });
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

    test('old book source URL redirects to the Legado workbench', async ({ page }) => {
        await page.goto('/admin/booksources');
        await expect(page).toHaveURL(/\/plugins\/legado/);
        await expect(page.getByRole('heading', { name: 'Legado 书源工作台' })).toBeVisible();
        await expect(page.getByText('测试书源')).toBeVisible();
    });

    test('keeps filters in the URL and reflows the details panel on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        const catalogPromise = page.waitForResponse(resp => resp.url().includes('/api/admin/plugins'));
        await page.goto('/admin/plugins?tab=sources');
        await catalogPromise;
        const description = page.getByText('控制本实例可用的内置插件，并维护全局设置。个人账号、密钥与设备由各用户自行配置。');
        await expect(description).toBeVisible();
        expect(await description.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        const search = page.getByRole('textbox', { name: '搜索名称、说明或能力' });
        await search.fill('OPDS');
        await expect(page).toHaveURL(/q=OPDS/);
        await expect(page.getByText('Generic OPDS')).toBeVisible();

        const card = page.locator('.management-row').filter({ hasText: 'Generic OPDS' });
        await card.getByRole('button', { name: '详情' }).click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        const dialogBox = await dialog.boundingBox();
        expect(dialogBox.width).toBeLessThanOrEqual(375);
        const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(pageWidth).toBeLessThanOrEqual(375);
    });

    test('keeps focus contained in details and restores it after Escape', async ({ page }) => {
        await page.goto('/admin/plugins?tab=sources');
        const card = page.locator('.management-row').filter({ hasText: 'Generic OPDS' });
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

    test('keeps text replacement preview highlights readable', async ({ page }) => {
        await page.goto('/plugins/text-replace');
        const bookSelect = page.getByRole('combobox', { name: '选择书籍' });
        await bookSelect.click();
        await page.getByRole('option', { name: /测试书/ }).click();
        await page.getByRole('textbox', { name: '查找内容' }).fill('测试');
        await page.getByRole('button', { name: '预览' }).click();

        const highlight = page.locator('mark', { hasText: '测试' });
        await expect(highlight).toBeVisible();
        await expect.poll(() => renderedContrast(highlight)).toBeGreaterThanOrEqual(4.5);

        await page.locator('.v-theme--light').first().evaluate(element => {
            element.classList.replace('v-theme--light', 'v-theme--dark');
        });
        await expect.poll(() => renderedContrast(highlight)).toBeGreaterThanOrEqual(4.5);
    });

    test('keeps plugin run decision badges readable in both themes', async ({ page }) => {
        await page.goto('/admin/plugins/runs/99');
        const decisions = page.locator('.plugin-item-preview__decision');
        await expect(decisions).toHaveCount(3);
        for (const decision of await decisions.all()) {
            expect(await renderedContrast(decision)).toBeGreaterThanOrEqual(4.5);
        }

        await page.locator('.v-theme--light').first().evaluate(element => {
            element.classList.replace('v-theme--light', 'v-theme--dark');
        });
        for (const decision of await decisions.all()) {
            expect(await renderedContrast(decision)).toBeGreaterThanOrEqual(4.5);
        }
    });
});
