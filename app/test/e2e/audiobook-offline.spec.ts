import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('offline quick and advanced jobs play real MP3; page cancellation reaches the producer', async ({ page, request }) => {
    const backend = 'http://127.0.0.1:8091';
    const folder = resolve('../document/audiobook-progress-v2-review');
    await page.goto('/');
    try {
        await expect(page.locator('.v-main')).toBeVisible({ timeout: 10000 });
    } catch {
        await page.reload();
        await expect(page.locator('.v-main')).toBeVisible({ timeout: 45000 });
    }
    await page.goto('/audio-jobs');
    await expect(page.getByTestId('create-audiobook-from-jobs')).toBeVisible({ timeout: 45000 });
    const playback = [];
    for (const mode of ['quick', 'advanced']) {
        await page.goto('/audios/create?book=1');
        await expect(page.getByTestId('select-audiobook-book-1')).toBeVisible({ timeout: 45000 });
        await expect(page.getByTestId('selected-book-panel')).toContainText('EPUB');
        await expect(page.getByTestId('create-wizard-unsupported-format')).toHaveCount(0);
        if (mode === 'advanced') await page.getByRole('button', { name: '高级模式', exact: true }).click();
        await page.getByRole('combobox', { name: '语音引擎' }).focus();
        await page.keyboard.press('ArrowDown');
        await page.getByRole('option', { name: 'Qwen3 TTS', exact: true }).click();
        await expect(page.getByTestId('submit-create-wizard')).toBeEnabled();
        const response = page.waitForResponse(response => response.url().endsWith('/api/book/1/audio-jobs') && response.request().method() === 'POST');
        await page.getByTestId('submit-create-wizard').click();
        const created = await (await response).json();
        expect(created.err).toBe('ok');
        const id = created.job.id;
        await page.goto(`/audio-job/${id}`);
        const card = page.locator(`[data-job-id="${id}"]`);
        if (mode === 'advanced') {
            // The detail route opens the review workspace automatically.
            await expect(page.getByTestId('confirm-workspace')).toBeVisible({ timeout: 45000 });
            await page.getByTestId('confirm-workspace').click();
        }
        await expect(card.getByRole('link', { name: '查看有声书', exact: true })).toBeVisible({ timeout: 45000 });
        await expect(card).toContainText('100%');
        if (mode === 'advanced') {
            // A second edition is a candidate; follow the existing publication flow.
            const edition = created.job.edition_id;
            const before = await (await request.get(`${backend}/_test/offline`)).json();
            expect(before.jobs.find((job: { job_id: number }) => job.job_id === id).edition_status).toBe('ready');
            await page.goto('/book/1/audios');
            const published = page.waitForResponse(response => response.url().endsWith(`/api/audio/${edition}`) && response.request().method() === 'PATCH');
            await page.getByTestId(`publish-edition-${edition}`).click();
            expect((await (await published).json()).err).toBe('ok');
            const firstLoad = await page.goto(`/audio/${edition}`);
            expect(await firstLoad!.text()).toContain('data-testid="play-audiobook"');
        } else {
            await card.getByRole('link', { name: '查看有声书', exact: true }).click();
        }
        await expect(page.getByTestId('play-audiobook')).toBeVisible({ timeout: 45000 });
        const media = page.waitForResponse(response => response.url().includes('/media/audio/') && [200, 206].includes(response.status()));
        await page.getByTestId('play-audiobook').click();
        const served = await media;
        expect(served.headers()['content-type']).toContain('audio/mpeg');
        expect((await served.body()).length).toBeGreaterThan(100);
        await expect(page.getByTestId('player-toggle')).toHaveAttribute('aria-label', '暂停');
        await expect(page.getByTestId('audiobook-player')).toContainText('第1章');
        playback.push({ mode, publication: mode === 'quick' ? 'automatic first edition' : 'candidate published using page button', media_status: served.status(), media_type: served.headers()['content-type'], bytes: (await served.body()).length, player_started: true });
        await page.getByTestId('player-toggle').click();
        await page.screenshot({ path: resolve(folder, `offline-${mode}-playback.png`), fullPage: true });
    }
    await request.post(`${backend}/_test/offline`, { data: { hold: true } });
    const created = await (await request.post(`${backend}/api/book/1/audio-jobs`, { data: { mode: 'quick', engine: 'qwen3tts', speed: 'x1.1' } })).json();
    expect(created.err).toBe('ok');
    const id = created.job.id;
    await page.goto(`/audio-job/${id}`);
    const card = page.locator(`[data-job-id="${id}"]`);
    await expect(card.getByTestId('generation-count')).toBeVisible({ timeout: 45000 });
    const cancelled = page.waitForResponse(response => response.url().endsWith(`/api/audio-job/${id}`) && response.request().method() === 'PATCH');
    await card.getByRole('button', { name: '取消', exact: true }).click();
    expect((await (await cancelled).json()).err).toBe('ok');
    await expect(card.getByTestId('generation-state')).toContainText('已取消', { timeout: 45000 });
    expect(await card.textContent()).not.toContain('100%');
    await page.screenshot({ path: resolve(folder, 'offline-page-cancelled.png'), fullPage: true });
    const evidence = await (await request.get(`${backend}/_test/offline`)).json();
    const result = evidence.jobs.find((job: { job_id: number }) => job.job_id === id);
    expect(result.status).toBe('cancelled');
    expect(result.progress).toBe(0);
    expect(result.edition_status).toBe('draft');
    expect(result.chapters).toBe(0);
    expect(result.generation.status).toBe('cancelled');
    expect(result.generation.completed).toBe(0);
    expect(result.supplier_calls).toBeGreaterThan(0);
    const calls = result.supplier_calls;
    await expect.poll(async () => {
        const jobs = (await (await request.get(`${backend}/_test/offline`)).json()).jobs;
        return jobs.find((job: { job_id: number }) => job.job_id === id).supplier_calls;
    }).toBe(calls);
    mkdirSync(folder, { recursive: true });
    writeFileSync(resolve(folder, 'offline-workflows.json'), JSON.stringify({ supplier: 'offline WAV fixture', playback, ...evidence }, null, 2));
});
