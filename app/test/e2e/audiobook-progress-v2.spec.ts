import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const screenshots = resolve('../document/screenshots/audiobook-progress-v2');
// Nuxt's HTTP readiness precedes compilation/hydration of the first client route.
test.beforeAll(async ({ browser }) => {
    const warmup = await browser.newPage();
    try {
        await warmup.goto('http://127.0.0.1:3009/');
        await expect(warmup.locator('.v-main')).toBeVisible({ timeout: 90000 });
    } finally {
        await warmup.close();
    }
});

const initialSnapshot = {
    schema: 'voicebook-progress.v2', unit: 'speech_segment', status: 'running', stage: 'synthesizing',
    total: 12, completed: 3, active: 3, pending: 6, retrying: 0, failed: 0, cancelled: 0, queued: 0,
    active_requests: 3, concurrency: 3, retries: 0, cache_hits: 0,
    chapters_total: 2, chapters_completed: 0, waiting: null,
    updated_at: new Date().toISOString(),
};
function makeJob() {
    return {
        id: 234, book_id: 1, edition_id: 1, mode: 'quick', status: 'generating', phase: 'GENERATING',
        progress: 0, cancel_requested: false, config: { engine: 'qwen3tts', speed: 'x1.0' },
        book: { id: 1, title: '并发生成测试书（模拟场景）', author: '离线模拟引擎', thumb: '/get/thumb_60x80/1.jpg' },
        plan: {
            detailed: true, overall_percent: null,
            phases: [{ key: 'generate', status: 'current', summary: { chapters_total: 2, chapters_completed: 0, segments_total: 10, segments_completed: 2 } }],
            summary: { chapters_total: 2, chapters_completed: 0, segments_total: 10, segments_completed: 2, cache_hits: 0, attempts: 1 },
            chapters: [],
        },
        generation: { available: true, protocol_version: 2, attempt_id: 'a1b2c3d4-first-attempt', connection: 'live', seq: 3, snapshot: { ...initialSnapshot } },
    };
}
async function capture(page: Page, name: string) {
    const contrastFailures = await page.getByTestId('generation-progress').evaluate(section => {
        const rgba = (color: string) => (color.match(/[\d.]+/g) || []).map(Number);
        const blend = (fg: number[], bg: number[]) => fg.slice(0, 3).map((v, i) => v * (fg[3] ?? 1) + bg[i] * (1 - (fg[3] ?? 1)));
        const background = (element: Element | null): number[] => {
            if (!element) return [255, 255, 255];
            return blend(rgba(getComputedStyle(element).backgroundColor), background(element.parentElement));
        };
        const luminance = (color: number[]) => color.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
        return Array.from(section.querySelectorAll('strong, span, p, dt, dd, small, time')).filter(element => {
            if (!element.textContent?.trim()) return false;
            const bg = background(element);
            const foreground = blend(rgba(getComputedStyle(element).color), bg);
            const levels = [luminance(bg), luminance(foreground)].sort((a, b) => a - b);
            return (levels[1] + .05) / (levels[0] + .05) < 4.5;
        }).map(element => element.textContent);
    });
    expect(contrastFailures).toEqual([]);
    mkdirSync(screenshots, { recursive: true });
    await page.locator('[data-job-id="234"]').screenshot({ path: resolve(screenshots, `${name}.png`) });
}

test('polls real unit counts, restores on refresh and resets on a new attempt', async ({ page }) => {
    const job = makeJob();
    await page.route('**/api/audio-jobs', route => route.fulfill({ json: { err: 'ok', jobs: [job] } }));
    await page.goto('/audio-job/234');
    await expect(page.getByTestId('generation-count')).toHaveText('已生成 3/12 个语音片段', { timeout: 45000 });
    await capture(page, 'desktop-generating');
    job.generation.snapshot.completed = 5;
    job.generation.snapshot.pending = 4;
    await expect(page.getByTestId('generation-count')).toContainText('5/12');
    await page.reload();
    await expect(page.getByTestId('generation-count')).toContainText('5/12', { timeout: 45000 });
    job.generation.attempt_id = 'e5f6a7b8-new-attempt';
    job.generation.snapshot.completed = 0;
    job.generation.snapshot.pending = 9;
    await expect(page.getByTestId('generation-count')).toContainText('0/12');
    await expect(page.getByTestId('generation-progress')).toContainText('e5f6a7b8');
    expect(await page.locator('[data-job-id="234"]').textContent()).not.toContain('100%');
    await page.goto('/audio-jobs');
    await expect(page.getByTestId('generation-count')).toContainText('0/12');
    await expect(page.getByTestId('generation-progress')).toContainText('e5f6a7b8');
});

test('shows rate limit, cooldown, cancellation and failed/retry states', async ({ page, context }) => {
    const job = makeJob() as ReturnType<typeof makeJob> & { error_message?: string };
    Object.assign(job.generation.snapshot, {
        status: 'rate_limit_retry', active: 0, retrying: 1, pending: 8, active_requests: 0, retries: 1,
        waiting: { reason: 'rate_limited', retry_count: 1, next_request_at: new Date(Date.now() + 60000).toISOString() },
    });
    await context.addCookies([{ name: 'theme', value: 'dark', url: 'http://127.0.0.1:3009' }]);
    await page.route('**/api/audio-jobs', route => route.fulfill({ json: { err: 'ok', jobs: [job] } }));
    await page.goto('/audio-job/234');
    await expect(page.getByTestId('generation-state')).toContainText('供应商限流', { timeout: 45000 });
    await expect(page.getByTestId('generation-wait')).toContainText('不是整书完成倒计时');
    await capture(page, 'desktop-dark-rate-limit');
    Object.assign(job.generation.snapshot, { status: 'cooling_down', waiting: { reason: 'shared_cooldown', retry_count: 1, next_request_at: null } });
    await expect(page.getByTestId('generation-state')).toContainText('共享冷却');
    await page.setViewportSize({ width: 320, height: 850 });
    await page.reload();
    await expect(page.getByTestId('generation-state')).toContainText('共享冷却', { timeout: 45000 });
    await expect(page.getByTestId('generation-wait')).toContainText('下次请求时间尚未确定');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
    await capture(page, 'mobile-dark-cooldown');
    job.cancel_requested = true;
    await expect(page.getByTestId('generation-state')).toContainText('正在取消');
    job.status = 'failed';
    job.error_message = '累计等待已耗尽，请调整配置后重试。';
    await expect(page.getByTestId('generation-state')).toContainText('失败');
    await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible();
});

test('does not complete until host publication and exposes stalled updates', async ({ page }) => {
    const job = makeJob();
    let disconnected = false;
    await page.route('**/api/audio-jobs', route => route.fulfill({ json: disconnected
        ? { err: 'unavailable', msg: '模拟连接中断' }
        : { err: 'ok', jobs: [job] } }));
    await page.goto('/audio-job/234');
    await expect(page.getByTestId('generation-count')).toBeVisible({ timeout: 45000 });
    disconnected = true;
    await expect(page.getByTestId('generation-api-error')).toContainText('连接中断');
    await expect(page.getByTestId('generation-count')).toContainText('3/12');
    disconnected = false;
    await expect(page.getByTestId('generation-api-error')).toHaveCount(0);
    job.generation.connection = 'stale';
    await expect(page.getByTestId('generation-connection')).toContainText('状态待确认');
    expect(await page.getByTestId('generation-count').textContent()).toContain('3/12');
    job.generation.connection = 'live';
    Object.assign(job.generation.snapshot, { completed: 12, active: 0, pending: 0, active_requests: 0, status: 'completed', stage: 'completed' });
    await expect(page.getByTestId('generation-state')).toContainText('等待校验发布');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    job.status = 'finalizing';
    job.phase = 'FINALIZING';
    await expect(page.getByTestId('generation-state')).toContainText('整理产物');
    await capture(page, 'desktop-finalizing');
    expect(await page.locator('[data-job-id="234"]').textContent()).not.toContain('100%');
    job.status = 'completed';
    job.phase = 'COMPLETED';
    await expect(page.locator('[data-job-id="234"]')).toContainText('100%');
    await expect(page.getByRole('link', { name: '查看有声书', exact: true })).toBeVisible();
});
