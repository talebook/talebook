import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { readFileSync } from 'node:fs';
import AudiobookGenerationProgress from '@/components/AudiobookGenerationProgress.vue';

const vuetify = createVuetify({ components, directives });
const zh = JSON.parse(readFileSync('i18n/locales/zh-CN.json', 'utf8'));
const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zh } });
const wrappers: VueWrapper[] = [];
const snapshot = {
    status: 'running', stage: 'synthesizing', total: 8, completed: 3,
    active_requests: 2, concurrency: 3, queued: 1, retrying: 1, failed: 0, retries: 2,
    updated_at: '2026-10-03T00:00:00Z', waiting: null,
};
const job = {
    status: 'generating', cancel_requested: false,
    generation: { protocol_version: 2, attempt_id: 'attempt-one', connection: 'live', snapshot },
};
function render(value: Record<string, unknown> = job) {
    const wrapper = mount(AudiobookGenerationProgress, {
        props: { job: value as typeof job }, global: { plugins: [vuetify, i18n] },
    });
    wrappers.push(wrapper);
    return wrapper;
}
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); wrappers.length = 0; vi.useRealTimers(); });

describe('AudiobookGenerationProgress', () => {
    it('reports absolute speech units and identifies the denominator', () => {
        const wrapper = render();
        expect(wrapper.get('[data-testid="generation-count"]').text()).toBe('已生成 3/8 个语音片段');
        expect(wrapper.text()).toContain('不代表整书耗时或剩余时间');
        expect(wrapper.get('[role="progressbar"]').attributes('aria-label')).toBe('语音片段完成比例');
        expect(wrapper.text()).toContain('活动请求 / 单本上限2/3');
    });

    it.each([
        ['rate_queued', 'request_interval', '限速排队'],
        ['rate_limit_retry', 'rate_limited', '供应商限流，等待重试'],
        ['retrying', 'network_error', '生成重试等待'],
        ['cooling_down', 'shared_cooldown', '共享冷却等待'],
    ])('shows %s without changing completed units', (status, reason, label) => {
        const wrapper = render({ ...job, generation: { ...job.generation, snapshot: {
            ...snapshot, status, waiting: { reason, retry_count: 2, next_request_at: null },
        } } });
        expect(wrapper.get('[data-testid="generation-state"]').text()).toBe(label);
        expect(wrapper.get('[data-testid="generation-count"]').text()).toContain('3/8');
        expect(wrapper.text()).toContain('下次请求时间尚未确定');
    });

    it('updates the request countdown locally and waits for scheduler confirmation at zero', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-10-03T00:00:00Z'));
        const wrapper = render({ ...job, generation: { ...job.generation, snapshot: {
            ...snapshot, status: 'rate_limit_retry', waiting: { reason: 'rate_limited', retry_count: 1, next_request_at: '2026-10-03T00:00:02Z' },
        } } });
        expect(wrapper.text()).toContain('计划等待 2 秒');
        await vi.advanceTimersByTimeAsync(1000);
        expect(wrapper.text()).toContain('计划等待 1 秒');
        await vi.advanceTimersByTimeAsync(1000);
        expect(wrapper.text()).toContain('等待调度确认');
        expect(wrapper.text()).toContain('不是整书完成倒计时');
    });

    it('does not show overall completion when all speech units are ready', () => {
        const wrapper = render({ ...job, generation: { ...job.generation, snapshot: {
            ...snapshot, completed: 8, status: 'completed', stage: 'completed',
        } } });
        expect(wrapper.get('[data-testid="generation-state"]').text()).toBe('生成已结束，等待校验发布');
        expect(wrapper.text()).toContain('仍需完成音频合成、写入和结果发布');
        expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
        expect(wrapper.text()).not.toContain('100%');
    });

    it('keeps cancellation visible until the host confirms termination', () => {
        const wrapper = render({ ...job, cancel_requested: true });
        expect(wrapper.text()).toContain('正在取消，等待活动请求结束');
    });

    it.each(['failed', 'cancelled', 'finalizing'])('shows host %s over generator completion', (status) => {
        const wrapper = render({ ...job, status, generation: { ...job.generation, snapshot: { ...snapshot, status: 'completed' } } });
        expect(wrapper.get('[data-testid="generation-state"]').text()).toBe(zh.audiobook[`status_${status}` as keyof typeof zh.audiobook]);
    });

    it('explains unavailable legacy details without showing a guessed percentage', () => {
        const wrapper = render({ ...job, generation: { protocol_version: 1, connection: 'idle', snapshot: null } });
        expect(wrapper.text()).toContain('详细实时进度不可用');
        expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    });

    it.each(['stale', 'interrupted'])('keeps counts and explains %s updates', (connection) => {
        const wrapper = render({ ...job, generation: { ...job.generation, connection } });
        expect(wrapper.get('[data-testid="generation-connection"]').text()).toContain('中断');
        expect(wrapper.text()).toContain('3/8');
    });

    it('replaces counts and attempt identity on a new attempt', async () => {
        const wrapper = render();
        await wrapper.setProps({ job: { ...job, generation: { ...job.generation, attempt_id: 'new-attempt', snapshot: { ...snapshot, completed: 0 } } } });
        expect(wrapper.text()).toContain('0/8');
        expect(wrapper.text()).toContain('生成尝试 new-atte');
        expect(wrapper.text()).not.toContain('attempt-');
    });

    it('distinguishes a failed API refresh while retaining confirmed counts', async () => {
        const wrapper = render();
        await wrapper.setProps({ connectionError: true });
        expect(wrapper.get('[data-testid="generation-api-error"]').text()).toContain('连接中断');
        expect(wrapper.text()).toContain('3/8');
    });
});
