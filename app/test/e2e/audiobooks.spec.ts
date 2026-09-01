import { expect, test, type Locator, type Page } from '@playwright/test';

async function gotoWithColdStartRetry(page: Page, url: string, ready: () => Locator) {
    await page.goto(url);
    try {
        await expect(ready()).toBeVisible({ timeout: 45_000 });
    } catch {
        await page.reload({ waitUntil: 'networkidle' });
        await expect(ready()).toBeVisible({ timeout: 45_000 });
    }
}

test.describe('Audiobook production and playback', () => {
    test.beforeEach(async ({ request, page }) => {
        page.on('response', (response) => {
            if (response.status() >= 400) console.info(`[browser-response] ${response.status()} ${response.url()}`);
        });
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        const response = await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true },
        });
        expect(response.ok()).toBeTruthy();
    });

    test('marks audiobook navigation and pages as Beta', async ({ page }) => {
        test.setTimeout(120_000);
        await gotoWithColdStartRetry(page, '/audios', () => page.getByTestId('audiobook-nav-beta'));
        await expect(page.getByTestId('audiobook-nav-beta')).toHaveText('Beta');
        const audiobookNav = page.locator('a[href="/audios"]').filter({ has: page.getByTestId('audiobook-nav-beta') });
        await expect(audiobookNav).toContainText('有声书');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');
        await expect(page.getByTestId('create-audiobook-entry')).toHaveAttribute('href', '/audios/create');
        await expect(page.getByTestId('create-audiobook-empty')).toHaveAttribute('href', '/audios/create');

        await page.goto('/book/1/audios');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');

        await page.goto('/audio-jobs');
        await expect(page.getByTestId('audiobook-beta')).toHaveText('Beta');
        await expect(page.getByTestId('audio-job-empty-state')).toBeVisible();
        await expect(page.getByTestId('create-audiobook-from-jobs')).toHaveAttribute('href', '/audios/create');
        await expect(page.getByTestId('open-library-to-create-job')).toHaveAttribute('href', '/audios/create');

        await page.getByText('管理', { exact: true }).click();
        await expect(page.getByRole('link', { name: '有声书任务' })).toHaveAttribute('href', '/audio-jobs');
    });

    test('creates an audiobook from the center wizard', async ({ page }) => {
        await page.goto('/audios/create?book=1');
        await expect(page.getByRole('heading', { name: '创建有声书' })).toBeVisible({ timeout: 30_000 });
        await expect(page.getByTestId('selected-book-panel')).toContainText('百年孤独', { timeout: 15_000 });
        await expect(page.getByTestId('wizard-book-status-1')).toContainText('可创建');

        await page.getByTestId('submit-create-wizard').click();
        await expect(page).toHaveURL('/audio-job/1');
        await expect(page.locator('[data-job-id="1"]')).toContainText('百年孤独');
    });

    test('excludes comics from every audiobook creation entry', async ({ page, request }) => {
        test.setTimeout(120_000);
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';

        await page.goto('/book/14');
        await expect(page.getByTestId('open-audiobook')).toHaveCount(0);

        await gotoWithColdStartRetry(page, '/audios/create?book=14', () => page.getByRole('heading', { name: '创建有声书' }));
        await expect(page.getByTestId('select-audiobook-book-14')).toHaveCount(0);
        await expect(page.getByTestId('selected-book-panel')).not.toContainText('图片漫画样例');
        await expect(page.getByTestId('submit-create-wizard')).toHaveCount(0);

        const response = await request.post(`${mockApi}/api/book/14/audio-jobs`, {
            data: { mode: 'quick', engine: 'edgetts' },
        });
        expect((await response.json()).err).toBe('media_type.not_supported');
    });

    test('guides unsupported formats to EPUB conversion before creation', async ({ page }) => {
        await page.goto('/audios/create?book=3');
        await expect(page.getByTestId('selected-book-panel')).toContainText('安徒生童话', { timeout: 15_000 });
        await expect(page.getByTestId('create-wizard-unsupported-format')).toContainText('需要先转换为 EPUB');
        await expect(page.getByTestId('convert-selected-book')).toHaveAttribute('href', '/book/3?convert=epub');
        await expect(page.getByTestId('submit-create-wizard')).toHaveCount(0);
    });

    test('routes active jobs instead of creating duplicates', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        const created = await request.post(`${mockApi}/api/book/1/audio-jobs`, {
            data: { mode: 'advanced', engine: 'edgetts', speed: 'x1.0' },
        });
        expect(created.ok()).toBeTruthy();
        expect((await created.json()).err).toBe('ok');

        await page.goto('/book/1/audios?create=1');
        await expect(page.getByTestId('view-active-audio-job')).toHaveAttribute('href', '/audio-job/1', { timeout: 15_000 });
        await expect(page.getByTestId('generate-audiobook')).toHaveCount(0);
        await expect(page.getByText('创建新的有声版本')).toHaveCount(0);

        await page.goto('/audios/create?book=1');
        await expect(page.getByTestId('create-wizard-active-job')).toContainText('已有制作中的任务', { timeout: 15_000 });
        await expect(page.getByTestId('view-active-job-from-wizard')).toHaveAttribute('href', '/audio-job/1');
        await expect(page.getByTestId('submit-create-wizard')).toHaveCount(0);
    });

    test('shows the real book and expands every generation step', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        const created = await request.post(`${mockApi}/api/book/1/audio-jobs`, {
            data: { mode: 'quick', engine: 'edgetts', speed: 'x1.0' },
        });
        expect(created.ok()).toBeTruthy();

        await page.goto('/audio-jobs');
        const card = page.locator('[data-job-id="1"]');
        const bookLink = card.getByRole('link', { name: '打开《百年孤独》的有声书页面' });
        await expect(card).toBeVisible({ timeout: 15_000 });
        await expect(bookLink).toHaveAttribute('href', '/book/1/audios', { timeout: 15_000 });
        await expect(bookLink).toContainText('加西亚·马尔克斯');
        await expect(bookLink.locator('img')).toHaveAttribute('src', /thumb_60x80\/1\.jpg/);
        await expect(card).toContainText(/整体进度|生成音频中/);

        await page.getByTestId('job-plan-toggle-1').click();
        const plan = page.getByTestId('job-plan-1');
        await expect(plan).toBeVisible();
        await expect(plan).toContainText('检查书籍与脚本');
        await expect(plan).toContainText('审查角色与对白');
        await expect(plan).toContainText('逐章生成音频');
        await expect(plan).toContainText('整理与校验产物');
        await expect(plan).toContainText('完成有声版本');
        await expect(plan).toContainText('第一章 雾中的来客');
        await expect(plan).toContainText('第二章 灯塔来信');
        await expect(plan).toContainText('分段');

        await page.setViewportSize({ width: 390, height: 844 });
        await expect(plan).toBeVisible();
        await expect(plan.getByText('第一章 雾中的来客')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    });

    test('generates, publishes, plays, and restores a chapter', async ({ page }) => {
        test.setTimeout(60_000);
        await page.goto('/book/1');
        await expect(page.getByTestId('open-audiobook')).toBeVisible({ timeout: 45_000 });
        await page.getByTestId('open-audiobook').click();
        await expect(page).toHaveURL('/book/1/audios');
        await expect(page.getByText('这本书还没有可收听版本')).toBeVisible();

        await page.getByTestId('generate-audiobook').click();
        await expect(page.getByText('创建新的有声版本')).toBeVisible();
        await page.getByTestId('submit-generation').click();
        await expect(page).toHaveURL('/audio-job/1');
        await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 10_000 });

        await page.getByRole('link', { name: '查看有声书' }).click();
        await expect(page.getByText('第一章 雾中的来客')).toBeVisible();
        await page.getByTestId('play-audiobook').click();
        await expect(page.getByTestId('audiobook-player')).toBeVisible();
        await expect(page.getByTestId('audiobook-player')).toContainText('第一章 雾中的来客');

        await page.goto('/audio-jobs');
        await page.getByTestId('view-script-1').click();
        await expect(page.getByText('角色配音表')).toBeVisible();
        await expect(page.getByTestId('confirm-workspace')).toHaveCount(0);
        await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('talebook:audiobook-player:v1')))).toBe(true);

        await page.reload();
        await expect(page.getByTestId('audiobook-player')).toBeVisible();
        await expect(page.getByTestId('audiobook-player')).toContainText('第一章 雾中的来客');
    });

    test('deletes the entire audiobook while keeping the ebook', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, audiobookVersions: true },
        });
        await request.post(`${mockApi}/api/book/1/audio-jobs`, {
            data: { mode: 'quick', engine: 'edgetts', speed: 'x1.0' },
        });
        await page.goto('/book/1/audios');

        await page.getByTestId('play-audiobook').click();
        await expect(page.getByTestId('audiobook-player')).toBeVisible();
        await expect.poll(async () => page.evaluate(() => Boolean(localStorage.getItem('talebook:audiobook-player:v1')))).toBe(true);

        await page.getByTestId('delete-audiobook').click();
        const dialog = page.getByTestId('delete-audiobook-dialog');
        await expect(dialog).toContainText('所有有声版本、历史、处理任务、剧本、日志和收听记录都会永久删除');
        await expect(dialog).toContainText('本次操作不会删除原始电子书文件');
        await dialog.getByRole('button', { name: '取消' }).click();
        await expect(dialog).toHaveCount(0);
        await expect(page.locator('.chapter-list').getByText('第一章 雾中的来客')).toBeVisible();

        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByTestId('delete-audiobook').click();
        await expect(dialog).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
        await page.getByTestId('confirm-delete-audiobook').click();

        await expect(dialog).toHaveCount(0);
        await expect(page.getByText('这本书还没有可收听版本')).toBeVisible();
        await expect(page.getByTestId('delete-audiobook')).toHaveCount(0);
        await expect(page.getByTestId('audiobook-player')).toHaveCount(0);
        await expect.poll(async () => page.evaluate(() => localStorage.getItem('talebook:audiobook-player:v1'))).toBeNull();
        const jobs = await request.get(`${mockApi}/api/audio-jobs`);
        expect((await jobs.json()).jobs).toEqual([]);
    });

    test('reviews characters and chapter text in advanced mode', async ({ page }) => {
        await page.goto('/book/1/audios');
        await page.getByTestId('generate-audiobook').click();
        await page.getByRole('button', { name: '高级模式' }).click();
        await expect(page.getByTestId('advanced-mode-panel')).toContainText('先识别，再进入配音工作台');
        await expect(page.getByTestId('advanced-mode-panel')).toContainText('调整角色音色与语速');
        await expect(page.getByTestId('submit-generation')).toHaveText('开始识别角色与对白');
        await page.getByTestId('submit-generation').click();

        await expect(page.getByText('等待脚本确认')).toBeVisible({ timeout: 10_000 });
        // The concrete job route parameter opens the review workspace as
        // soon as inspection finishes; no second click should be necessary.
        await expect(page.getByText('角色配音表')).toBeVisible();
        await expect(page.getByText('旁白', { exact: true }).first()).toBeVisible();
        await expect(page.getByTestId('script-normalization-report')).toContainText('章节 4 → 2');
        await expect(page.getByTestId('script-normalization-report')).toContainText('清理 8 个非内容块');
        expect(await page.getByTestId('script-normalization-report').evaluate(element => element.scrollHeight <= element.clientHeight)).toBeTruthy();

        await page.getByRole('tab', { name: '单章对白' }).click();
        const editor = page.locator('.script-editor textarea');
        await editor.fill('[旁白] 海雾散开了。\n[林夏] 我们出发吧。');
        await page.getByTestId('save-chapter').click();
        await page.getByTestId('confirm-workspace').click();
        await expect(page.getByText('已完成', { exact: true })).toBeVisible({ timeout: 10_000 });
    });

    test('shows real casting controls and manages candidate history', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, audiobookVersions: true },
        });
        await page.goto('/book/1/audios');

        await expect(page.getByTestId('edition-management')).toContainText('候选与历史版本');
        await expect(page.getByTestId('publish-edition-2')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('rollback-edition-3')).toBeVisible({ timeout: 15_000 });
        await page.getByTestId('publish-edition-2').click();
        await expect(page.getByTestId('publish-edition-2')).toHaveCount(0);

        await page.getByTestId('generate-audiobook').click();
        await expect(page.getByLabel('男主角音色（可选）')).toBeVisible();
        await expect(page.getByLabel('女主角音色（可选）')).toBeVisible();
    });

    test('creates a script revision, regenerates one chapter, and replaces only after completion', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, audiobookPublished: true },
        });
        await page.goto('/book/1/audios');
        await page.getByTestId('create-audio-revision').click();

        await expect(page).toHaveURL('/audio-job/1');
        await expect(page.getByTestId('script-normalization-report')).toHaveCount(0);
        await page.getByRole('tab', { name: '单章对白' }).click();
        await page.locator('.script-editor textarea').fill('[旁白] 海雾散开以后，码头终于露出了清晰的轮廓。');
        await page.getByTestId('regenerate-current-chapter').click();
        await expect(page.locator('[data-job-id="1"] .job-topline')).toContainText('已完成', { timeout: 10_000 });

        await page.goto('/book/1/audios');
        await expect(page.getByTestId('publish-edition-4')).toHaveText('替换当前版本');
        await page.getByTestId('publish-edition-4').click();
        await expect(page.getByTestId('publish-edition-4')).toHaveCount(0);
        await expect(page.getByTestId('edition-management')).toContainText('历史');
    });

    test('cleans only backups beyond the configured retention count', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, audiobookVersions: true, audiobookBackupCount: 5 },
        });
        page.once('dialog', dialog => dialog.accept());
        await page.goto('/book/1/audios');

        const cleanup = page.getByTestId('cleanup-audio-backups');
        await expect(cleanup).toContainText('2');
        await cleanup.click();
        await expect(cleanup).toBeDisabled();
        await expect(page.getByTestId('edition-management')).toContainText('现有 3 个历史备份');
    });

    test('blocks generation and explains when disk capacity is insufficient', async ({ page, request }) => {
        const mockApi = process.env.MOCK_API_URL || 'http://127.0.0.1:8080';
        await request.post(`${mockApi}/_test/reset`, {
            data: { installed: true, audiobookCapacityOk: false },
        });
        await page.goto('/book/1/audios');

        await expect(page.getByTestId('audiobook-capacity-warning')).toContainText('新的生成任务已暂停');
        await expect(page.getByTestId('generate-audiobook')).toHaveCount(0);
    });
});
